# Test Cases: Notifications

App URL: https://peoplix-hr.vercel.app/notifications (plus the bell in the navbar on every page)
Access: every role (Admin, HR, Employee). Each person sees only their own notifications.

> Most cases need two or three accounts. In this file **Account A** is the person acting,
> **Account B** is the person being notified, and **Account C** is a bystander who is not involved.
> The feed itself is covered in [`12-engagement.md`](12-engagement.md).
>
> The bell checks for new notifications about once a minute while the tab is visible, and again
> whenever the window regains focus. Where a case says "wait", allow up to 60 seconds or switch
> away from the tab and back.

## Who gets notified

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | A tags B in an ordinary post | Post text: "Thanks @B for the help" | B gets one notification: "A tagged you in a post" with a short preview of the text. C gets nothing |
| 2 | A (HR/Admin) tags B in an announcement | Announcement mentioning @B | B gets "A tagged you in an announcement". No one else is notified, not even C |
| 3 | A tags B in a poll question | Poll: "Offsite on @B's team day?" | B gets "A tagged you in a poll" |
| 4 | A tags B inside a kudos message (B is not the recipient) | Kudos to D, message mentions @B | B gets "A tagged you in a kudos message"; D (the recipient) gets a separate kudos notification |
| 5 | A gives kudos to B | Kudos recipient: B | B gets "A gave you kudos 🎉" with the message as preview. C gets nothing |
| 6 | A gives kudos to B and also tags B in the message | Recipient B, message mentions @B | B gets exactly **one** notification (the kudos one), not two |
| 7 | A tags B in a comment on any post | Comment: "Thoughts, @B?" | B gets "A tagged you in a comment" |
| 8 | A comments on B's post (no tag) | B is the post's author | B gets "A commented on your post" (wording follows the post: "your announcement", "your poll", "your kudos post") |
| 9 | A comments on B's post and also tags B in the comment | Comment mentions @B on B's own post | B gets exactly **one** notification (the "tagged you in a comment" one), not two |
| 10 | A comments on A's own post | Own post | No notification is created for anyone |
| 11 | A tags themselves | Post or comment mentioning @A | No notification is created |
| 12 | A publishes an announcement that tags nobody | Plain announcement | Nobody is notified; there is no broadcast. B and C see it in the feed (and in the "New" count) only |
| 13 | A tags five people in one post | Five different tags | Each of the five gets their own notification; the sixth tag attempt is rejected by the API with "You can tag up to 5 people at a time" |
| 14 | A reacts to B's post | Any emoji | B gets a notification "A reacted 👍 to your post" (full rules in the Reaction notifications section below) |
| 15 | A comments on B's post, C also comments, and neither tags anyone | Two commenters | Only B (the post's author) is notified; C is not notified about A's comment |
| 16 | A comments on B's post three times in a row before B reads anything | Three comments by A | B has one unread "A commented on your post" notification, not three |
| 17 | After B reads that notification, A comments on B's post again | New comment | A new notification appears for B |
| 18 | Create a notification while the notification write fails (simulated) | N/A | The post or comment is still saved normally; a notification problem never blocks the action |

## The bell & unread badge

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 19 | Look at the navbar on any page as each role | Employee, HR, Admin | A bell icon is present on desktop and on mobile widths, next to the theme toggle |
| 20 | View the bell with nothing unread | B with no unread items | No badge is shown |
| 21 | View the bell with 3 unread | B with 3 unread | A red badge shows "3"; the bell's accessible label says "Notifications, 3 unread" |
| 22 | View the bell with more than 9 unread | B with 12 unread | Badge shows "9+" |
| 23 | A tags B while B has the app open on another page | B on `/leave` | Within about a minute the badge appears or increases, without B reloading |
| 24 | B switches to another browser tab, A tags B, B returns | Tab hidden then focused | Badge updates immediately on focus |
| 25 | A tags B while B has the app open | B on any page | A toast appears: "A tagged you in a post" (matching the notification text) with the preview and a "View" button |
| 26 | Click "View" on the toast | Toast action | Goes to `/notifications` |
| 27 | Load the app for the first time with unread notifications waiting | B logs in with 5 unread | Badge shows 5 but **no** toast is shown (toasts are only for notifications that arrive while the app is open) |
| 28 | Log out and check the badge endpoint | `GET /api/notifications/unread-count` without a session | `401` Unauthorized |

## Dropdown

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 29 | Click the bell | B with notifications | A panel opens with a heading "Notifications", a brief loading skeleton, then up to the 8 most recent items |
| 30 | Look at a notification row | Any unread item | Shows the actor's avatar with a small icon badge (@ for tags, award for kudos, speech bubble for comments), the sentence ("**A** tagged you in a post"), a two-line preview, and a relative time; unread rows have a tinted background and a dot at the left |
| 31 | Look at a read notification row | Already-read item | No tint and no dot; the time text is not emphasised |
| 32 | Open the bell with no notifications at all | Fresh account | Friendly empty state: "You're all caught up..." |
| 33 | Click "Mark all as read" in the panel | B with unread items | All rows lose their tint, the badge disappears, and the link itself is hidden afterwards (it only shows when something is unread) |
| 34 | Click "See all notifications" | Footer link | Panel closes and `/notifications` opens |
| 35 | Open the panel at 375px width | Phone viewport | Panel fits inside the screen with margins (no sideways scroll, nothing cut off) |
| 36 | Press Esc or click outside the panel | Open panel | Panel closes |
| 37 | Use the dropdown in dark mode | Dark theme | Text, tinted rows, dots, and badge remain readable |

## Opening a notification

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 38 | Click a "tagged you in a post" notification | Notification from case 1 | Panel closes; browser goes to `/engagement/posts/{id}` showing **only** that post (not the whole feed), with its comments already open and a "Back to feed" link |
| 39 | Click a "tagged you in a poll" notification | Case 3 | Opens only that poll, and B can vote on it from there |
| 40 | Click a kudos notification | Case 5 | Opens only that kudos post |
| 41 | Click a "tagged you in a comment" notification | Case 7 | Opens the post with comments open, scrolled to the tagged comment, which is highlighted |
| 42 | Click a "commented on your post" notification | Case 8 | Opens the post, scrolled to and highlighting the new comment |
| 43 | Check the unread count after opening | Before: 3 unread | The row is marked read and the badge drops to 2 |
| 44 | Click "Back to feed" | On the single post page | Returns to `/engagement` |
| 45 | Middle-click or Ctrl/Cmd-click a notification | Any row | Opens the post in a new tab (rows are real links) |
| 46 | Open a notification after the post was deleted | A or an Admin deletes the post first | The notification has already disappeared with the post; if an old link is used directly, a friendly "This post is no longer available" card appears with a "Back to feed" link |
| 47 | Open a notification after only the comment was deleted | Delete the tagged comment | That notification is gone; the post's other notifications remain |
| 48 | Open `/engagement/posts/{id}` for a post B is allowed to see but never got a notification for | Any valid post id | Page works normally (it is a plain post view; the notification is just one way to reach it) |

## Grouping

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 49 | Three different people (A, C, D) comment on B's post, none read yet | Three unread comment notifications on one post | B sees **one** row: "A, C and 1 other commented on your post" with the newest comment's preview |
| 50 | Two people comment | A and C | Row reads "A and C commented on your post" |
| 51 | Click the grouped row | Group of three | Opens the post highlighting the newest comment; all three notifications become read and the badge drops by three |
| 52 | Use "Mark as read" on a grouped row | Group of three | All three are marked read together |
| 53 | Remove a grouped row | Group of three | All three are removed together |
| 54 | Comments on two different posts | A comments on post 1 and post 2 | Two separate rows (grouping is per post) |
| 55 | Tag notifications from the same person | A tags B in three different posts | Three separate rows; only comment notifications group |
| 56 | Already-read comment notifications | One read, two unread on the same post | The two unread are grouped; the read one stays as its own row |
| 57 | The API response for a grouped row | `GET /api/notifications` | Still returns one entry per comment; grouping is done in the browser |

## Row actions

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 58 | Hover a row on desktop | Mouse over a notification | Two small buttons fade in at the right: mark read/unread and remove |
| 59 | View rows on a touch device | Phone or touch emulation | The two buttons are always visible (there is no hover) |
| 60 | Click "Mark as read" on an unread row | Unread row | The tint and dot disappear, the button becomes "Mark as unread", the badge drops by one; the page does not navigate |
| 61 | Click "Mark as unread" on a read row | Read row | The tint and dot return and the badge increases by one |
| 62 | Click the remove (X) button | Any row | The row disappears immediately; if it was unread the badge drops by one; the page does not navigate |
| 63 | Remove while offline | Network off | The row comes back and an error toast "Couldn't remove the notification" appears |
| 64 | Reload after marking and removing | After cases 60 to 62 | Read/unread state and removals persist |

## Notifications page

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 65 | Open `/notifications` | B with many notifications | Card titled "Notifications" with "All" and "Unread" tabs, a "Mark all as read" button (when something is unread), and the 20 most recent items |
| 66 | Open the page with no notifications | Fresh account | Empty state "You're all caught up" with a hint about tags, kudos, and comments |
| 67 | Click the "Unread" tab | Mix of read and unread | List reloads with only unread items; the tab shows a count pill when there are unread items |
| 68 | Switch back to "All" | After Unread | Full list returns |
| 69 | Click "Mark all as read" | B with unread items | Every row becomes read, the pill and button disappear, and the navbar badge clears |
| 70 | Mark items read on this page and look at the navbar bell | Mark one read | The navbar badge updates without waiting for the next poll |
| 71 | Scroll to the bottom with more than 20 notifications | 30 items | A "Show older" button appears; clicking loads the next batch without duplicates; it disappears when there are no more |
| 72 | Use "Show older" while on the Unread tab | 30 unread | Only older **unread** items are appended |
| 73 | Open the page at 375px width | Phone viewport | No horizontal scroll; row text wraps; action buttons stay reachable |
| 74 | Open the page while logged out | No session | Redirected to `/login` |

## Privacy & security

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 75 | B reads notifications through the database REST endpoint | `GET /rest/v1/notifications` with B's token | Only B's own rows are returned |
| 76 | Admin reads notifications through the database REST endpoint | Admin token | Only the Admin's own rows; Admin cannot read anyone else's |
| 77 | Try to create a notification directly | `POST /rest/v1/notifications` with B's token, naming any recipient | Rejected: there is no insert policy, so no user can forge a notification |
| 78 | Try to change a notification's text or recipient directly | `PATCH /rest/v1/notifications` changing `preview` or `recipient_id` | Rejected: only `read_at` can be updated |
| 79 | Mark someone else's notification read by API | `PATCH /api/notifications/{id}` with another user's id | Returns success but changes nothing (the row is invisible to you) |
| 80 | Remove someone else's notification by API | `DELETE /api/notifications/{id}` with another user's id | Returns success but the other user's notification is untouched |
| 81 | Call the endpoints with a malformed id | `PATCH /api/notifications/abc` | `404` "Notification not found" |
| 82 | Call `GET /api/notifications` and `POST /api/notifications/read-all` without a session | No cookie or token | `401` Unauthorized |
| 83 | Mark unread by API | `PATCH /api/notifications/{id}` with `{ "read": false }` | `read_at` returns to empty and the badge count rises |
| 84 | Ask for the unread view by API | `GET /api/notifications?unread=1` | Only unread notifications, newest first, with a correct `unread_count` |
| 85 | Page through by API | `GET /api/notifications?limit=5`, then `before=<last created_at>` | `has_more` is accurate; limits above 50 are capped |

## Clean-up & data lifecycle

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 86 | Delete a post that has notifications | Post tagging B | B's notification for it disappears (no dead links are left behind) |
| 87 | Delete the actor's account | A deletes their own account | Notifications that A caused are removed from B's list |
| 88 | Delete the recipient's account | B deletes their account | B's notifications are removed with it |
| 89 | Run Clear Database as the System Admin | See [`07-settings-danger-zone.md`](07-settings-danger-zone.md) | Notifications for removed posts are gone with them |
| 90 | Run the daily cleanup job with the correct secret | `GET /api/cron/audit-log-cleanup` with `Authorization: Bearer <CRON_SECRET>` | Response includes `notificationsDeleted`; notifications older than 30 days are removed (read or not), newer ones stay |
| 91 | Call the cleanup job without the secret | No or wrong bearer token | `401` Unauthorized |

## Reaction notifications

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 92 | A reacts to B's post with 👍 | B is the post's author | B gets "A reacted 👍 to your post" with a preview of the post; C gets nothing |
| 93 | A reacts to B's announcement, poll, and kudos post | One of each | Wording follows the post: "reacted 👏 to your announcement", "... to your poll", "... to your kudos post" |
| 94 | A reacts to B's comment | B wrote the comment | B gets "A reacted 🎉 to your comment"; opening it highlights that comment |
| 95 | A reacts to their own post or comment | A is the author | No notification is created |
| 96 | A adds three different emojis to B's post in a row | 👍, 🎉, 🚀 | B has one unread notification from A for that post (repeats from the same person collapse while unread) |
| 97 | After B reads it, A adds another emoji to the same post | New emoji | A new notification appears for B |
| 98 | A toggles 👍 on and off several times while B has not read it | Add, remove, add, remove, add | B ends with at most one unread notification from A, never a growing pile |
| 99 | A adds 👍 then removes it before B opens the bell | Only reaction A had on that post | The notification disappears from B's list and the badge count drops (a reaction taken back is withdrawn) |
| 100 | A adds two emojis then removes just one | A still has one reaction left | B's notification stays |
| 101 | A removes a reaction after B has already read the notification | Read notification | The read notification stays in B's list |
| 102 | Three people (A, C, D) react to B's post and none is read | Different emojis | B sees one row: "A, C and 1 other reacted to your post" (no emoji, since they differ); clicking opens the post and marks all three read |
| 103 | Only one person reacted | A alone | The row names the emoji: "A reacted 👍 to your post" |
| 104 | People react to B's post and to B's comment | A on the post, C on the comment | Two separate rows (post reactions and comment reactions never group together) |
| 105 | Reaction notification links | Click it | Opens `/engagement/posts/{id}` (with `?comment=` for a comment reaction), showing only that post |
| 106 | Reaction on a post that was then deleted | A reacts, post is deleted | B's notification is removed with the post |
| 107 | A reacts to B's post when B is not tagged anywhere | Plain reaction | B still gets the notification (it goes to the content's author, not to tagged people) |
| 108 | Check what else is notified | A reacts to B's post that tags C | C is **not** notified; only the author B is |
| 109 | Toast for a new reaction while B has the app open | B on any page | Toast "A reacted 👍 to your post" with a "View" button |

## Wish notifications

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 110 | A sends a birthday wish to B on B's birthday | See [`12-engagement.md`](12-engagement.md) § Birthdays & wishes | B gets "A wished you a happy birthday 🎂" with A's message as the preview; C gets nothing |
| 111 | A sends a work-anniversary milestone wish to B | B's 5-year anniversary | B gets "A congratulated you on your work anniversary 🏆" |
| 112 | Several people wish B on the same day | A, C, D | B sees one row: "A, C and 1 other wished you a happy birthday 🎂" |
| 113 | B has a birthday and a milestone on the same day | Two cards | Two separate rows, one per celebration |
| 114 | Click a wish notification | Birthday wish | Goes to `/engagement?wishes=<date>&occasion=birthday` and opens B's card with the list of wishes automatically |
| 115 | Click a milestone wish notification | Milestone wish | Opens the milestone card ("Your 5-year work anniversary 🏆") |
| 116 | The page opened by a wish notification | Dialog open | B sees no wish form (cannot wish themselves), just the messages; closing the dialog leaves the feed as normal |
| 117 | Open the link with a date that has no wishes | Edited URL | Dialog opens with "Wishes from your teammates will appear here." |
| 118 | Open the link with a malformed date or occasion | `?wishes=abc` / `?occasion=x` | Ignored: the page loads normally with no dialog |
| 119 | A removes their wish after B has not read the notification | Wish deleted | The wish disappears from the card; the notification remains but the card simply no longer lists it |
| 120 | Mark wish notifications read / unread / remove them | Row actions | Work the same as any other notification (and grouped rows act as a unit) |
| 121 | A wishes B on a celebration, then B's account is deleted | B deleted | Their notifications and the wishes for them are removed with the account |

> The previous statement that "reactions do not notify" no longer applies. Rows 14 and 92 to 109
> cover reaction notifications.

## Birthday / anniversary card notifications

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 122 | A comments on B's birthday card | B is the celebrant | B gets "A commented on your birthday card" with a preview; C gets nothing |
| 123 | A tags C in a comment on B's card | C is neither the celebrant nor the commenter | C gets "A tagged you on a birthday card"; B also gets "A commented on your birthday card" |
| 124 | A tags B (the celebrant) in a comment on B's own card | Comment mentions @B | B gets exactly one notification (the tag one), not two |
| 125 | A reacts to B's card | Any emoji | B gets "A reacted 🎉 to your birthday card"; work anniversary cards say "anniversary card" |
| 126 | A adds several reactions in a row, or toggles one on and off | Same card | B has one unread notification from A, and it is withdrawn if A removes all their reactions before B reads it |
| 127 | Three people react to B's card | A, C, D | One grouped row: "A, C and 1 other reacted to your birthday card" |
| 128 | Reactions on B's card and on C's card | Different people's cards | Never grouped together |
| 129 | Click a card-comment notification as the celebrant | B | `/engagement?wishes=<date>&occasion=birthday&for=<B's id>` opens B's card with the discussion |
| 130 | Click a "tagged you on a birthday card" notification as C | C was tagged on B's card | The link carries `for=<B's id>`; the dialog opens **B's** card (not C's), showing the wishes and the comment that tagged C |
| 131 | Open that link after the card's window has closed | A few days later | Card opens read-only with the closed note |
| 132 | Open the link with a malformed `for` value | `&for=abc` | Ignored: the dialog opens for your own card (or none if nothing matches) |
| 133 | A comments on their own card | Self | No notification is created |
| 134 | Delete the celebrant's account | B deleted | Notifications about B's card disappear |
| 135 | Mark read / unread / remove card notifications | Row actions | Work like any other; grouped rows act as a unit

## Card holder notifications for every kind of card

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 136 | Comment on an ordinary anniversary card (for example 4 years) | A comments on B's card | B gets "A commented on your anniversary card" |
| 137 | React to and wish on that card | A reacts 🎉 and sends a wish | B gets "A reacted 🎉 to your anniversary card" and "A congratulated you on your work anniversary 🏆" (grouped if several people do the same) |
| 138 | Comment, react and wish on a welcome card | A on B's new-joiner card | B gets "A commented on your welcome card", "A reacted 👏 to your welcome card", and "A welcomed you to the team 👋" |
| 139 | Tag a colleague in a welcome or anniversary card comment | C tagged | C gets "A tagged you on a welcome card" / "...on an anniversary card", and the link opens B's card |
| 140 | Comment with only a GIF, photo or clip on any card | Attachment-only comment | B gets a notification whose preview reads "Sent a GIF" / "Sent a photo" / "Sent a video" |
| 141 | Comment with text and an attachment | "Congrats!" + GIF | The preview shows the text |
| 142 | Several comments from different people on one card | A, C, D | One grouped row: "A, C and 1 other commented on your birthday card"; clicking opens the card and marks all read |
| 143 | The same person comments three times while the first is unread | A x3 | B has one unread notification from A for that card |
| 144 | Open the notification link for each kind of card | birthday, milestone, anniversary, new_joiner | Each opens that card with its discussion (`...&occasion=<kind>&for=<card holder>`) |

> The earlier assumption that only birthdays and 3/5/10-year milestones have cards no longer
> applies: rows 122 to 135 hold for every kind of card.
