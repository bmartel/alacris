#!/usr/bin/env bash
#
# Run semantic-release, and survive losing a push race.
#
# The library and the UI release from two workflows that deliberately do not
# share a concurrency group: a UI publish waiting on an Alacris publish is the
# coupling release-ui.yml exists to avoid. The price of that independence is
# that the two can collide — both push a release commit to main, and whichever
# arrives second is rejected non-fast-forward. That is what happened to
# @alacris/ui 0.3.0, which failed on
#
#   git push --tags ... HEAD:main -> failed to push some refs
#
# Losing is safe to retry. @semantic-release/git commits and pushes during
# `prepare`, which runs ahead of the npm publish and the GitHub release, so a
# rejected push means nothing was published and there is no half-finished
# release to unpick. What a retry must do is start from the branch tip:
# semantic-release refuses to release from a checkout that is behind its
# remote, which is why re-running the failed job by hand did nothing but
# report "The local branch main is behind the remote one".
#
# The first attempt is left alone, on exactly the tree that was just built and
# tested. Only a retry refreshes.
set -euo pipefail

branch="${GITHUB_REF_NAME:-main}"
attempts="${RELEASE_ATTEMPTS:-3}"

for attempt in $(seq 1 "$attempts"); do
  if [ "$attempt" -gt 1 ]; then
    echo "release: refreshing to the tip of ${branch} before attempt ${attempt}"
    # Checkout ran with persist-credentials: false, so the token goes on the
    # URL, the same way the seed tag is pushed.
    git fetch --force --tags \
      "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" \
      "${branch}"
    git reset --hard FETCH_HEAD
  fi

  if "$@"; then
    exit 0
  fi

  if [ "$attempt" -lt "$attempts" ]; then
    echo "release: attempt ${attempt} did not complete; retrying"
    sleep $((attempt * 20))
  fi
done

echo "release: gave up after ${attempts} attempts" >&2
exit 1
