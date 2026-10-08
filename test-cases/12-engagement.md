# Test Cases: Employee Engagement

App URL: https://peoplix-hr.vercel.app/engagement
Access: every role (Admin, HR, Employee) can read, post, comment, and react. Announcements are published by Admin/HR. Moderating someone else's content is Admin only.

> Notification behavior (the bell, tag alerts, comment alerts) is covered in
> [`13-notifications.md`](13-notifications.md). Several cases below need two or three accounts
> (for example an Employee, an HR account, and an Admin), noted per row as "Account A / B / C".

## Page layout & navigation

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 1 | Log in as each role and look at the sidebar | Employee, HR, Admin accounts | An "Engagement" link is present for all three roles and opens `/engagement` |
| 2 | Open `/engagement` on a desktop-width window (1280px+) | Any valid account | Two columns: the feed (composer, search, filter chips, posts) on the left, and a sticky right-hand column with the Celebrations card (when it has content) above an "Announcements" heading and list |
| 3 | Open `/engagement` below the `lg` breakpoint (for example 768px) | Any valid account | The right-hand column collapses into two tabs, "Feed" and "Announcements"; only the selected one is shown; the Celebrations card (when present) appears at the top of the Feed tab |
| 4 | Open `/engagement` at 375px width | Phone-sized viewport | No horizontal page scroll; composer, filter chips (scroll sideways inside their own row), post cards, and tabs all fit the screen |
| 5 | Toggle between light and dark theme on the page | Theme toggle | All cards, chips, badges, and the composer remain readable; accent colour follows the theme (no hard-coded colours) |
| 6 | Open `/engagement` while logged out | No session | Redirected to `/login` |
| 7 | Open `/engagement` with no posts in the database | Fresh or just-cleared database | Feed shows an empty state ("Nothing here yet. Be the first to share something with the team."); Announcements list shows "No announcements yet." |

## Composer: posts

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 8 | Look at the composer as an Employee | Valid Employee account | Three modes are offered: Post, Kudos, Poll. The "Announcement" checkbox is **not** present anywhere |
| 9 | Look at the composer as HR and as Admin, in Post mode | Valid HR / Admin account | An "Announcement" checkbox is present |
| 10 | Leave the text empty or type only spaces | Content: blank / `"   "` | The submit button is disabled |
| 11 | Type a short post and click "Post" | Content: "Hello team" | Button shows "Posting..." briefly; the post appears at the top of the feed with the author's name, designation, and "just now" style time; composer clears |
| 12 | Type text and press Ctrl+Enter (Cmd+Enter on macOS) | Content: "Shortcut test" | Post is submitted the same as clicking "Post" |
| 13 | Type until 200 or fewer characters remain | Content of 1800+ characters | A "N left" counter appears; it turns red at 20 or fewer |
| 14 | Try to type past the limit | Content over 2000 characters | The textarea stops accepting characters at 2000 |
| 15 | Submit a post over 2000 characters by calling the API directly | `POST /api/posts` with 2001-character `content` | Server rejects with `400` "Posts are limited to 2000 characters" |
| 16 | Include a web address in a post | Content: "See https://example.com/docs." | The address renders as a clickable link that opens in a new tab; trailing punctuation (the final ".") is not part of the link |
| 17 | Post text containing HTML | Content: `<script>alert(1)</script><b>hi</b>` | The characters appear as plain text; nothing executes and no markup is rendered |
| 18 | Post a very long message (over about 420 characters) | 600 characters of text | Post shows the first lines with a "Show more" link; clicking expands it and the link becomes "Show less" |
| 19 | Post text with line breaks | Content with 3 separate lines | Line breaks are preserved in the rendered post |
| 20 | Reload the page after posting | N/A | The post is still there (it was saved), in the same position |

## Announcements & pinning

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 21 | As HR or Admin, tick "Announcement", write text, and click "Publish" | Content: "Office closed Friday" | Button label changes to "Publish"; a toast "Announcement published" appears; the item shows in the Announcements column (or tab, on small screens) with an "Announcement" badge; it does not appear in the main feed |
| 22 | As an Employee, call `POST /api/posts` with `is_announcement: true` | Employee session, API client | Server rejects with `403` "Only Admin or HR can publish announcements" |
| 23 | As HR/Admin, try to publish an announcement as Kudos or Poll | `POST /api/posts` with `is_announcement: true` and `kind: "poll"` | Rejected with `400` "Announcements can't be kudos or polls"; in the UI the Announcement checkbox only exists in Post mode, and switching mode clears it |
| 24 | As HR/Admin, look at an announcement card | Any announcement | A pin icon button is present ("Pin announcement") |
| 25 | As an Employee, look at an announcement card | Any announcement | No pin button is shown |
| 26 | As HR/Admin, click the pin button on an announcement | Older announcement | A "Pinned" badge appears and the announcement moves to the top of the Announcements list; the button now offers "Unpin announcement" |
| 27 | Pin three announcements, then try to pin a fourth | 4 announcements | The fourth attempt shows an error toast "You can pin up to 3 announcements. Unpin one first." and stays unpinned |
| 28 | Unpin a pinned announcement | Pinned announcement | The badge disappears, and after a reload the announcement sits in its normal date position |
| 29 | Reload the page | After pinning | Pinned announcements are still on top, in the same order |
| 30 | As an Employee, call `PATCH /api/posts/{id}` with `{ "is_pinned": true }` | Employee session | Server rejects with `403` |
| 31 | As HR/Admin, try to pin an ordinary (non-announcement) post by API | `PATCH /api/posts/{id}` on a normal post | Rejected with `400` "Only announcements can be pinned" |
| 32 | Try to change a post's text through the database REST endpoint | Employee or HR session, `PATCH /rest/v1/posts` with a new `content` | Rejected: the only column anyone may update is `is_pinned`, and only staff may update it |

## Kudos

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 33 | Switch the composer to "Kudos" | N/A | A colleague picker ("Who do you want to recognize?") and a row of company-value chips appear above the message box |
| 34 | Open the colleague picker and type part of a name | "ahi" | List filters by name or designation; your own account is never listed |
| 35 | Leave the colleague, value, or message missing | Any one of the three empty | The "Give kudos" button stays disabled until all three are provided |
| 36 | Send kudos | Colleague B, value "Teamwork", message "Great release" | A toast "Kudos sent 🎉" appears; the post shows a highlighted banner with B's avatar, name, designation, and a "Teamwork" badge, with the message below |
| 37 | Give kudos to yourself by API | `POST /api/posts` with `kudos_recipient_id` set to your own id | Rejected with `400` "You can't give kudos to yourself" |
| 38 | Give kudos with an unknown value by API | `kudos_value: "bravery"` | Rejected with `400` "Choose a company value for the kudos" |
| 39 | Give kudos to an id that does not exist | `kudos_recipient_id` with a random valid UUID | Rejected with `400` "That colleague no longer exists" |

## Polls

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 40 | Switch the composer to "Poll" | N/A | The text box becomes the poll question; two option inputs appear; the photo/video button is hidden |
| 41 | Start a poll with only one option filled in | Question + 1 option | "Start poll" stays disabled until two options have text |
| 42 | Add options up to the limit | Click "Add option" repeatedly | Up to 5 options can exist; "Add option" disappears at 5; a remove (X) button appears on each option only while more than 2 exist |
| 43 | Create a poll with two or more options | "Lunch?" with "Pizza", "Biryani" | The poll appears in the feed with the question in bold and clickable options |
| 44 | Submit a poll with duplicate options by API | `poll_options: ["Pizza", "pizza"]` | Rejected with `400` "Poll options must be different from each other" |
| 45 | Submit a poll with 1 or 6 options by API | `poll_options` of length 1 / 6 | Rejected with `400` "A poll needs 2 to 5 options" |
| 46 | Attach files to a poll by API | `kind: "poll"` with `media` | Rejected with `400` "Polls can't have attachments" |
| 47 | View a poll you have not voted in | Any poll | No percentages are shown; footer reads "N votes · Vote to see the results" |
| 48 | Click an option | Any option | Your choice is marked with a check; every option now shows a percentage and vote count with a proportional bar; footer reads "... · Tap another option to change your vote" |
| 49 | Click a different option | Other option | Your vote moves: the old option loses one vote, the new one gains one, total stays the same |
| 50 | Vote as a second account | Account B | Totals and percentages include both votes; each account sees its own choice marked |
| 51 | Vote for an option that belongs to a different poll by API | `POST /api/posts/{id}/vote` with another poll's option id | Rejected with `400` "That option isn't part of this poll" |
| 52 | Lose the connection and vote | Network offline | The vote reverts and an error toast "Couldn't save your vote. Please try again." appears |

## Emoji reactions (posts and comments)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 53 | Click "React" under a post with no reactions | Any post | An emoji picker opens with a search box, a row of group tabs, and the groups Appreciation, Feelings, People & gestures, Work, and Team life, with a skin-tone selector at the bottom |
| 54 | Type in the picker's search box | "thank", "cricket", "zzzz" | List filters by name or keyword ("🙏 Thank you", "🏏 Cricket"); a no-match search shows "No matching reactions" |
| 55 | Pick an emoji | 👍 | The picker closes; a chip "👍 1" appears highlighted as yours |
| 56 | Add several different emojis to the same post | 👍, 🎉, 🚀 | Three chips appear, in the order added, all highlighted; one person can hold many different reactions |
| 57 | Click a chip you already have | Your 👍 chip | The reaction is removed; the count drops (or the chip disappears at zero) |
| 58 | Open the picker when you already used some emojis | Post with your 👍 | Your emojis are highlighted in the picker; picking one removes it |
| 59 | Hover a chip that others also used | 👍 from you, Jane, and Rahim | Tooltip reads along the lines of "You, Jane and Rahim reacted with 👍" |
| 60 | React with the same emoji from a second account | Account B picks 👍 | Chip count becomes 2; each account sees only its own chip highlighted |
| 61 | Reload the page | After reacting | Chips, counts, and highlights persist |
| 62 | React on a comment | Open a thread, click the small reaction button under a comment | Same behavior as on posts, with smaller chips |
| 63 | Send an emoji outside the allowed set by API | `POST /api/posts/{id}/reactions` with `{ "emoji": "🦄" }` | Rejected with `400` "Unknown emoji" |
| 64 | Add the same reaction twice by API | Two identical `POST` calls | Both return success; only one reaction exists (no duplicate, no error) |
| 65 | Remove a reaction that does not exist by API | `DELETE /api/posts/{id}/reactions?emoji=👍` when you have none | Returns success (the end state is "no reaction from me") |
| 66 | Lose the connection and react | Network offline | The chip reverts and an error toast "Couldn't save your reaction. Please try again." appears |
| 67 | Try to add a reaction on behalf of another user via the database REST endpoint | `POST /rest/v1/post_reactions` with another user's `user_id` | Rejected by Row Level Security |
| 68 | Reactions on a deleted post or comment | React just after the post was deleted elsewhere | `404` "Not found"; no orphan rows remain |

## Photo & video attachments

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 69 | Hover the "Photo / video" button | N/A | Tooltip states the limits (photos up to 3.0 MB, 4 max; or one video up to 20.0 MB) |
| 70 | Attach one JPG under 3 MB | 1.5 MB JPG | A small preview tile with the file size appears and an X to remove it |
| 71 | Attach a photo of exactly 3 MB | 3,145,728 bytes | Accepted |
| 72 | Attach a photo over 3 MB | 4 MB PNG named `big.png` | Rejected with a red alert: `"big.png" is 4.0 MB, but photos can be at most 3.0 MB.`; nothing is attached |
| 73 | Attach a video over 20 MB | 24 MB MP4 named `clip.mp4` | Rejected: `"clip.mp4" is 24.0 MB, but videos can be at most 20.0 MB.` |
| 74 | Attach a video of exactly 20 MB | 20,971,520 bytes MP4 | Accepted; tile shows a play icon over the first frame |
| 75 | Attach an unsupported file | `report.pdf`, `setup.exe`, `.heic` photo | Rejected: `"report.pdf" isn't a supported file. Attach a JPG, PNG, WebP or GIF photo, or an MP4, WebM or MOV video.` |
| 76 | Attach an empty (0 byte) file | `empty.png` | Rejected: `"empty.png" is empty.` |
| 77 | Attach a fifth photo | 4 photos already attached | Rejected: `You can attach up to 4 photos per post. "5.png" wasn't added.` |
| 78 | Attach a second video | 1 video already attached | Rejected: `A post can include only one video. "b.mp4" wasn't added.` |
| 79 | Attach a video while photos are attached | 1 photo + a video | Rejected: `A post can have photos or a video, not both. Remove the photos to attach "a.mp4".` |
| 80 | Attach a photo while a video is attached | 1 video + a photo | Rejected: `A post can have photos or a video, not both. Remove the video to attach "a.png".` |
| 81 | Select several files at once, some valid and some not | 2 valid photos + 1 oversize + 1 PDF | The 2 valid photos are attached; a message is listed for each rejected file in the same alert |
| 82 | Remove an attached tile with its X | Any attachment | Tile disappears; the validation alert clears |
| 83 | Drag a photo onto the composer | Drag from the desktop | Composer shows a highlighted ring while dragging; dropping attaches the file (with the same validation) |
| 84 | Paste an image into the text box | Copy an image, paste in the composer | Image is attached (with the same validation); text paste still works normally |
| 85 | Switch from Post mode to Poll mode with files attached | 2 photos attached | Attachments are cleared (polls cannot have attachments) |
| 86 | Post with photos | 3 photos + text | Button shows "Uploading..." then "Posting..."; post appears with a compact thumbnail grid |
| 87 | Post with a video | 10 MB MP4 | Post shows an inline video player with controls, at a compact size |
| 88 | Check thumbnail sizing | Posts with 1, 2, 3, and 4 photos | Previews stay small (a single photo is capped at roughly 256px tall; multi-photo grids are no wider than about 24rem); they never fill the whole card |
| 89 | Click a thumbnail | Any photo | A viewer opens with the full-size image; for several photos, left/right buttons and the arrow keys move between them; Esc or the close button exits |
| 90 | Make the upload fail (go offline right after clicking Post) | Attached photo | An error toast appears, no post is created, and the form keeps your text so you can retry |
| 91 | Upload a file over the bucket limit directly to Storage | Authenticated client, 4 MB file to `post-images` | Storage itself rejects it (size limit), independent of the UI |
| 92 | Upload a disallowed type directly to Storage | `.exe` to `post-videos` | Storage rejects it (mime type) |
| 93 | Upload into another user's folder directly | Path starting with another user's id | Rejected by the Storage policy (writes allowed only inside your own `{user-id}/` folder) |
| 94 | Submit a post referencing someone else's file path | `media[0].path` starting with another user's id | Rejected with `400` "Invalid attachment" |
| 95 | Submit a post claiming an oversize file | `size_bytes` of 4 MB for an image | Rejected with `400` "Photos can be at most 3.0 MB" |
| 96 | Submit a post with 5 photos, or a photo plus a video, by API | `media` array of 5 images / mixed | Rejected with `400`; any files already uploaded for it are removed from Storage |

## Tagging (@mentions)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 97 | Type `@` in the composer | Content: "Hi @" | A suggestion list opens under the box showing up to 6 colleagues (your own name is not included) |
| 98 | Type part of a first name | "@jan" | List narrows to people with a first or last name starting with "jan" |
| 99 | Type part of a last name | "@doe" | People whose last name starts with "doe" are listed |
| 100 | Type a first name, a space, then part of the last name | "@jane d" | Jane Doe is still suggested (up to two words are matched) |
| 101 | Use the keyboard in the list | Arrow Down / Up, Enter or Tab, Esc | Arrows move the highlight; Enter or Tab inserts the person; Esc closes the list without inserting; Enter does **not** submit the post while the list is open |
| 102 | Click or tap a suggestion | Any person | The text becomes `@Jane Doe ` with the cursor after it; the list closes; the text box keeps focus |
| 103 | Type an email address | "mail me at a@b.com" | No suggestion list opens (an `@` in the middle of a word is not a tag) |
| 104 | Type `@` followed by a name that matches nobody | "@zzzz" | List does not appear (or closes) |
| 105 | Post a message containing a picked tag | "Thanks @Jane Doe for the help" | Posted text shows "@Jane Doe" as a highlighted chip |
| 106 | View a post that tags **you** | Logged in as the tagged person | Your chip is highlighted more strongly than other people's |
| 107 | Pick a tag, then edit the typed name | Change "@Jane Doe" to "@Jane Do" | The edited text posts as plain text, not as a tag |
| 108 | Pick a tag, then delete it from the text | Remove "@Jane Doe" entirely | Nothing about Jane is stored or notified |
| 109 | Tag the same person twice | "@Jane Doe and again @Jane Doe" | Both occurrences render as tags |
| 110 | Tag more than 5 people by API | `content` containing 6 tag tokens | Rejected with `400` "You can tag up to 5 people at a time" |
| 111 | Tag a person who no longer exists by API | Token with a random valid UUID | Rejected with `400` "Someone you tagged no longer exists" |
| 112 | Type a tag in a comment box | Open a thread, type "@ra" | The same suggestion list works in the comment input |
| 113 | Rename the tagged person in Settings, then view the old post | Jane Doe renames to Jane Roy | The tag in the old post now shows the new name (tags follow the person, not the old text) |
| 114 | Check character counting with tags | A post near 2000 characters containing a tag | The limit counts what is displayed ("@Jane Doe"), not the hidden id, so a post that looks under the limit is accepted |
| 115 | Tag someone inside a poll question or kudos message | "Vote @Jane Doe!" / kudos text | Tag renders as a chip in both |

## Comments

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 116 | Click the comment button on a post | Any post | A thread opens with a brief loading skeleton, then existing comments (oldest first) and a "Write a comment..." box |
| 117 | Try to send a comment with no text | Blank input | The send button is disabled |
| 118 | Post a comment | "Congrats!" | Comment appears at the bottom of the thread; the post's comment count goes up by one |
| 119 | Type past 500 characters | 501 characters | The input stops at 500; by API, 501 characters returns `400` "Comments are limited to 500 characters" |
| 120 | Comment on a post that was just deleted elsewhere | Open thread, delete the post in another tab, then send | `404` "Post not found" and an error toast |
| 121 | View comment delete controls on desktop | Hover your own comment | A delete (trash) icon fades in on hover; on touch devices it is always visible |
| 122 | Delete your own comment | Confirm in the dialog | Comment disappears and the count drops by one |
| 123 | As an Employee, look at someone else's comment | Another user's comment | No delete control is shown |
| 124 | As HR, look at someone else's comment | Another user's comment | No delete control is shown (HR cannot moderate) |
| 125 | As Admin, delete someone else's comment | Another user's comment | Delete control is shown and works; the comment disappears for everyone |
| 126 | Delete another user's comment by API as Employee/HR | `DELETE /api/posts/{id}/comments/{commentId}` | `403` "You can only delete your own comments" |
| 127 | Open the same thread in two browsers and add a comment in one | Two sessions | The other session sees it after reopening the thread or refreshing (no live push) |

## Deleting posts & moderation

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 128 | View your own post | Any role | A delete (trash) button is present |
| 129 | View someone else's post as an Employee | Another user's post | No delete button |
| 130 | View someone else's post as HR | Another user's post | No delete button (HR can publish announcements but cannot moderate others' content) |
| 131 | View someone else's post as Admin | Another user's post | Delete button is present |
| 132 | Delete a post | Confirm in the dialog | Dialog warns that comments, reactions, and attachments will be removed; on confirm the post disappears for everyone |
| 133 | Delete a post with attachments, then check Storage | Post with photos | The files are gone from the `post-images` / `post-videos` bucket, not just the database rows |
| 134 | Delete another user's post by API as Employee/HR | `DELETE /api/posts/{id}` | `403` "You can only delete your own posts" |
| 135 | Delete a post that was already deleted | Second `DELETE` | `404` "Post not found"; in the UI the card is dropped without an error |
| 136 | Try to delete another user's post through the database REST endpoint as Employee/HR | `DELETE /rest/v1/posts?id=eq...` | No row is deleted (Row Level Security allows only the author or an Admin) |
| 137 | Delete a post with comments, reactions, and a poll | Busy post | Everything attached to it disappears with it (no orphaned rows) |

## Search, filters & keeping up

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 138 | Click the filter chips: All, Mentions, Posts, Kudos, Polls | Each chip | List reloads showing only that kind (with a short loading skeleton); the selected chip is highlighted; announcements are not affected by Posts/Kudos/Polls |
| 139 | Type in "Search posts and announcements..." | "offsite" | After a short pause, both the feed and the announcements list narrow to posts containing the text (case-insensitive) |
| 140 | Search for text with no matches | "qqqqqq" | Feed shows `No posts match “qqqqqq”.` and announcements show `No announcements match “qqqqqq”.` |
| 141 | Search for text containing `%` or `_` | "50%" | Treated as plain characters, not wildcards |
| 142 | Click the X in the search box | After typing | Search clears and the full lists return |
| 143 | Click "Mentions" | Account B that has been tagged | Only posts and announcements that tag you are listed |
| 144 | Click "Mentions" with nothing tagging you | Fresh account | Empty state "Nobody has tagged you in a post yet." |
| 145 | Publish a kudos while the "Polls" filter is active | Filter: Polls | The view switches back to All so your new kudos is visible |
| 146 | Publish anything while a search is active | Search: "offsite" | Search clears and the full lists return with your new item |
| 147 | Scroll to the bottom with more than 10 posts | 25+ posts | Ten are shown with a "Show older" button; clicking loads the next ten, with no duplicates; the button disappears when there are no more |
| 148 | Pinned announcements and "Show older" | 3 pinned + 15 other announcements | Pinned ones stay on top; "Show older" continues with older unpinned ones and never repeats a pinned one |
| 149 | Visit for the first time ever | Account that never opened the page | No "New" badges anywhere |
| 150 | Have another user post, then return after leaving the page | Account A leaves; Account B posts; A returns | B's post shows a "New" badge; A's own posts never do |
| 151 | Check the Announcements tab with new announcements | Small screen | The tab shows a count pill of new announcements; on desktop the heading shows "N new" |
| 152 | Open the page again after viewing | Return a second time | Posts seen before leaving are no longer marked "New" |

## Celebrations card

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 153 | An employee's joined date is a milestone number of years ago today (3, 5, 10, 15, 20...) | Joined date: same month and day, 5 years ago | Card lists them with "5-year work anniversary · Today", a 🏆, and a "Wish" button for everyone else |
| 154 | An employee's joined date is a non-milestone anniversary (1, 2, 4, 6, 7, 8, 9...) today | Joined date: 4 years ago today | Listed as "4-year work anniversary · Today" with a 🎊 and a full card: a "Congratulate" button that opens the same wishes, comments and reactions card as a milestone |
| 155 | Anniversary or birthday falls within the next 7 days | Joined date a few days ahead on the calendar | Card shows "Tomorrow" or "In N days" and, instead of a button, the note "Opens on the day" |
| 156 | Anniversary is more than 7 days away | Joined date 3 weeks ahead | Not listed |
| 157 | A milestone anniversary was 2 days ago | Joined date 2 days back, 10 years ago | Still listed ("Yesterday" / "2 days ago") with a "Belated wish" button; at 4 or more days ago it disappears |
| 158 | A plain (non-milestone) anniversary was yesterday | 7 years ago, yesterday | Still listed ("Yesterday") with a "Belated congratulate" button, for 3 days after; at 4 or more days it disappears |
| 159 | Employee joined within the last 14 days | Joined date: 3 days ago | Listed as "Joined 3 days ago" with a 👋 and a "Welcome" button that opens their welcome card (open for 14 days from joining) |
| 160 | No celebrations at all | Quiet period | The Celebrations card is not shown |
| 161 | More than 6 celebrations (desktop) or 3 (mobile) | Many matches | A "+N more" note appears below the list |
| 162 | Order of the list | Mix of today, upcoming, belated, and new joiners | Today's first, then upcoming (soonest first), then recent belated ones, then new joiners |

## Single post view

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 163 | Open `/engagement/posts/{id}` for an existing post | Valid post id | Only that post is shown, with its comments already open, plus a "Back to feed" link to `/engagement` |
| 164 | Open the URL for a deleted or unknown post | Deleted id / random UUID | A friendly "This post is no longer available" card with a "Back to feed" link (not a raw 404 page) |
| 165 | Open the URL with a malformed id | `/engagement/posts/abc` | Same friendly message |
| 166 | Open `/engagement/posts/{id}?comment={commentId}` | Valid comment id | Comments are open, the page scrolls to that comment, and it is highlighted |
| 167 | Delete the post from the single-post page | Own post | Toast "Deleted" and you are taken back to `/engagement` |
| 168 | Open the URL while logged out | No session | Redirected to `/login` |

## Data safety & access control

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 169 | Call any `/api/posts` endpoint without a session | No cookie or token | `401` Unauthorized |
| 170 | Insert a post as another user via the database REST endpoint | `author_id` of someone else | Rejected by Row Level Security |
| 171 | Insert a media row pointing at someone else's post via REST | `post_id` of another user's post | Rejected by Row Level Security |
| 172 | Rapidly create many posts | 12+ requests in 10 seconds | Further requests get `429` "Too many requests, please slow down and try again." (when Redis is configured; without it, no limiting) |
| 173 | Delete an employee account that has posts, comments, and uploaded files | Disposable account | Their posts, comments, reactions, and votes disappear, and their uploaded files are removed from Storage |
| 174 | Run "Clear Database" as the System Admin | See [`07-settings-danger-zone.md`](07-settings-danger-zone.md) | All posts, comments, reactions, polls, and uploaded files are removed; `/engagement` shows the empty states |

## Profile preview on hover (tagged people)

> Applies wherever a colleague is tagged: posts, announcements, polls, kudos messages, and comments,
> plus the recipient's name on a kudos banner.

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 175 | Hover the mouse over a tagged name and hold it there | `@Jane Doe` in a post | After a short pause (about a quarter of a second) a small card appears showing Jane's profile photo (or initials), full name, designation, and email |
| 176 | Move the mouse across several tags quickly without stopping | Skim over a post with 3 tags | No cards flash up (the short delay prevents it) |
| 177 | Move the mouse from the tag onto the card | Hover, then move down onto the card | The card stays open so the email link can be clicked; moving away closes it shortly after |
| 178 | Click the email on the card | Card open | Opens a new email to that address (`mailto:`) |
| 179 | Hover a colleague who has approved leave covering today | On-leave employee's tag | The card shows a 🌴 "On leave today" badge |
| 180 | Hover a colleague who is not on leave | Any other tag | No leave badge appears; a pending or rejected leave request never shows the badge |
| 181 | Tap a tag on a touch device | Phone or touch emulation | The card opens on tap (there is no hover) and closes when tapping outside |
| 182 | Focus a tag with the keyboard and press Enter or Space | Tab to the tag | The card opens; Esc closes it and keeps focus on the tag |
| 183 | Hover the recipient's name on a kudos banner | Kudos post | The same card appears |
| 184 | Hover a tag in a comment, a poll question, and a kudos message | One of each | The card works in all of them |
| 185 | Hover a tag of someone whose account was deleted | Old post tagging a deleted user | No card opens; the name is shown as plain text without error |
| 186 | Hover a tag after the person is renamed or changes designation | Edited profile | The card shows the current name and designation |
| 187 | Check what the card contains | Any card | Only photo, name, designation, email (with a copy button), and the leave badge; no phone number, date of birth, age, or birthday |
| 188 | Open the card at 375px width | Phone viewport | Card fits within the screen with margins and nothing is cut off |
| 189 | Use the card in dark mode | Dark theme | Text, badge, and link remain readable |

## Birthdays & wishes

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 190 | Open the Celebrations card when a teammate who is sharing their birthday has a birthday today | Teammate with a saved birthday, sharing on | Row shows their name, "🎂 Birthday · Today", and a "Wish" button |
| 191 | View a birthday coming up in the next 7 days | Birthday in 3 days | Row shows "Birthday · In 3 days" with **no** Wish button (wishes open on the day) |
| 192 | View a birthday from the last 3 days | Birthday 2 days ago | Row shows "Birthday · 2 days ago" with a "Belated wish" button; 4 or more days ago it is gone |
| 193 | A teammate has a birthday but unticked "Let teammates celebrate my birthday" | Sharing off | They never appear in anyone's Celebrations card |
| 194 | A teammate never saved a birthday | No birthday on file | They never appear as a birthday; nothing hints that a birthday is missing |
| 195 | Check that only day and month are exposed | View the page source and network responses for `/engagement` | No year of birth, age, or full date of birth appears anywhere, only the celebrated day for the current year |
| 196 | Look at your own birthday day | Own birthday today | Your row is highlighted, reads "It's your birthday! 🎉", and has a "View wishes" button instead of "Wish" |
| 197 | Click "Wish" on a teammate's row | Teammate's birthday today | A dialog opens titled "<First name>'s birthday 🎂" with their photo, name, designation, three quick-message chips, a text box, and the list of wishes already on the card |
| 198 | Click a quick-message chip | e.g. "Happy birthday! 🎂" | The text box fills with that message and the chip shows as selected; the message can still be edited |
| 199 | Type your own message and watch the counter | 200-character limit | A "N left" counter updates; typing stops at 200 |
| 200 | Try to send an empty or whitespace-only wish | Blank | "Send wish" stays disabled |
| 201 | Send a wish | Chip or custom text | Toast "Birthday wish sent 🎂"; your wish appears at the top of the list; the form is replaced by "Your wish is on the card..."; closing the dialog shows "Wished ✓" on the row and the count goes up |
| 202 | Try to send a second wish for the same birthday | By API: `POST /api/wishes` again | Rejected with `400` "You've already sent a wish for this"; the UI never offers the form again |
| 203 | Open a teammate's card where you already wished | "Wished ✓" row | Dialog opens showing the wishes and your own entry labelled "(you)" |
| 204 | View the list of wishes | Several senders | Each shows avatar, name, relative time, and message, newest first; "N wishes" heading counts them |
| 205 | Open a card nobody has signed | New birthday | Empty message: "No wishes yet. Be the first to send one!" |
| 206 | Open your own card before anyone wished | Own birthday | Empty message: "Wishes from your teammates will appear here." and no wish form |
| 207 | Wish yourself by API | `POST /api/wishes` with your own id | Rejected with `400` "You can't send a wish to yourself" |
| 208 | Wish for a date that is not their birthday | `occasion_date` of a random day | Rejected with `400` ("Birthday wishes can be sent on the day or up to 3 days after") |
| 209 | Wish ahead of time or long after | Birthday tomorrow / 10 days ago | Rejected with `400`; the UI shows no button in those cases |
| 210 | Wish for a teammate who isn't sharing or has no birthday | Sharing off / none saved | Rejected with `400` "This birthday isn't open for wishes" (same message for both cases, so it can't be used to find out who has set a birthday) |
| 211 | Send a wish with a message over 200 characters by API | 201 characters | Rejected with `400` "Wishes are limited to 200 characters" |
| 212 | Remove your own wish | Trash icon on your entry | Confirm dialog; the wish disappears, the count drops, and the row goes back to offering "Wish" |
| 213 | Look at the remove control on other people's wishes as an Employee or HR | Someone else's wish | No remove control |
| 214 | Look at the remove control as Admin | Someone else's wish | Remove control is present and works (and is recorded in the Audit Log) |
| 215 | Remove someone else's wish by API as Employee/HR | `DELETE /api/wishes/{id}` | `403` "You can only remove your own wishes" |
| 216 | Try to insert a wish directly through the database REST endpoint | `POST /rest/v1/celebration_wishes` | Rejected: wishes can only be created through the API, which checks it really is their day |
| 217 | Send many wishes quickly | 12+ requests in 10 seconds | Further requests get `429` (when Redis is configured) |
| 218 | Use the wish dialog on a phone | 375px width | Dialog fits the screen, the list scrolls inside it, and buttons are reachable |
| 219 | Press Esc or click outside the dialog | Open dialog | It closes; any unsent text is discarded |

## Work-anniversary milestone wishes

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 220 | Open a milestone row on its day | Colleague with a 5-year anniversary today | Dialog titled "<First name>'s 5-year work anniversary 🏆" with milestone quick messages ("Congratulations on your milestone! 🏆", "Thank you for everything you do! 🙌", "Here's to many more years together! 🚀") |
| 221 | Send a milestone wish | Any message | Same behaviour as birthday wishes: toast "Wish sent 🏆", entry on the card, "Wished ✓" on the row |
| 222 | Check which years offer a card | Colleagues at 1, 2, 3, 4, 5, 9, 10, 11, 15 years | All of them: every work anniversary has a card. 3, 5, 10, 15 and every 5th year after are "milestones" (🏆); the other years use 🎊 |
| 223 | File a card under the wrong kind by API | `occasion: "milestone"` for a 4-year anniversary, or `"anniversary"` for a 5-year one | Rejected with `400` "That isn't the right kind of card for this anniversary" |
| 224 | Wish for a milestone on the wrong date | A day other than their anniversary | Rejected with `400` |
| 225 | Same person has both a birthday and a milestone on the same day | Both today | Two separate rows and two separate cards, each wished independently |
| 226 | Milestone and birthday wishes on the same card | Open each dialog | Wishes never mix between the two cards |
| 227 | Your own milestone | Own anniversary today | Row highlighted with "View wishes"; no wish form |

## Copy email from the profile preview

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 228 | Open the profile preview of a tagged colleague | Hover or tap a tag | A small copy icon sits right next to the email address |
| 229 | Click the copy icon | Preview open | The email is copied to the clipboard; the icon changes to a check and the tooltip reads "Copied!" for about a second and a half, then returns to the copy icon |
| 230 | Paste somewhere after copying | Any text field | The pasted value is exactly that person's email address |
| 231 | Hover the copy icon before clicking | Preview open | Tooltip reads "Copy email" and the preview stays open while the pointer moves onto the icon |
| 232 | Click the email address text itself | Preview open | Still opens a new email (`mailto:`); only the icon copies |
| 233 | Copy on a page where clipboard access is blocked | Insecure origin or blocked permission | An error toast "Couldn't copy. Select the address and copy it manually." appears and the preview does not break |
| 234 | Copy using the keyboard | Tab to the icon, press Enter or Space | Same result as clicking |

## Delete buttons (colour and behaviour)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 235 | Look at the trash icon on your own post, comment, card comment, and wish | Light theme | The icon is a soft red, a stronger red with a faint red background on hover (not grey or green) |
| 236 | Look at the same icons in dark mode | Dark theme | Still red, readable on the dark card, with a subtle red hover background |
| 237 | Click the trash icon | Any of the above | A confirmation dialog opens; its "Delete" button is a **solid red** (not green) with readable text, a hover lift, and a visible focus ring |
| 238 | Check the confirm button in dark mode | Dark theme | Solid coral-red with dark text (readable, not a washed-out tint, and clearly different from the teal primary buttons) |
| 239 | Check the other destructive confirmations | Delete Account, Clear Database, Delete All Audit Logs, delete today's attendance | Their confirm buttons are the same solid red in both themes |
| 240 | Click "Delete" | Confirm | Button shows "Deleting..." and is disabled until the item is gone; "Cancel" stays neutral |
| 241 | Compare with primary actions | Post, Send wish, Save | Primary buttons stay teal; only destructive confirms are red |

## Birthday / anniversary card conversation

> Cards take new comments and reactions on the day and for 3 days after (the same window as
> wishes). After that they stay readable but become read-only.

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 242 | Open a card during its window | Wish dialog on today's birthday | Below the wishes there is a row of reactions with an add-reaction button, the comments (if any), and an "Add a comment... use @ to tag someone" box |
| 243 | React to the card | Pick 🎉 in the picker | A chip "🎉 1" appears highlighted; clicking it again removes it; several different emojis are allowed |
| 244 | Hover a reaction chip on a card | Reaction from two people | Tooltip lists who reacted, same as on posts |
| 245 | Post a comment on the card | "Happy birthday from the whole team!" | The comment appears at the bottom with your name and "just now" |
| 246 | Tag a colleague in a card comment | Type `@` and part of a name, pick them | The same suggestion list as on posts appears (inside the dialog); the comment shows a highlighted tag chip |
| 247 | Hover the tag in a card comment | Tagged colleague | The profile preview opens with a copy-email button |
| 248 | Post more than 500 characters | 501 characters | The box stops at 500; by API, 501 displayed characters returns `400` "Comments are limited to 500 characters" |
| 249 | Tag more than 5 people by API | 6 tag tokens | Rejected with `400` "You can tag up to 5 people at a time" |
| 250 | Delete your own card comment | Trash icon | Confirm dialog with a red Delete button; the comment disappears |
| 251 | Look at delete controls on other people's card comments | Employee/HR vs Admin | Employees and HR see none on others' comments; Admin sees them and can delete |
| 252 | Delete someone else's card comment by API as Employee/HR | `DELETE /api/wishes/comments/{id}` | `403` "You can only delete your own comments" |
| 253 | Open a card whose window has closed | Birthday 5 days ago, via a notification link | The wishes, comments and reactions are visible, reactions cannot be changed, the comment box is replaced by "This card is closed for new comments and reactions." |
| 254 | Comment or react on a closed or fake card by API | Wrong date / not their birthday | Rejected with `400` starting "This card is closed." |
| 255 | Comment or react on the card of someone who is not sharing their birthday | Sharing off | Rejected with `400` (same as wishes) |
| 256 | The celebrant comments on and reacts to their own card | Own card today | Allowed (they can say thanks); they get no notification for their own actions |
| 257 | Create a card comment or reaction directly through the database REST endpoint | `POST /rest/v1/celebration_comments` / `celebration_reactions` | Rejected: they can only be created through the API, which checks the celebration is real |
| 258 | Add the same card reaction twice | Two identical `POST` calls | Both succeed; only one reaction exists; only one audit entry and one notification |
| 259 | Open the card on a phone | 375px width | Dialog scrolls, the comment box and suggestion list fit the screen |

## Joining date and milestones

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 260 | Change your joining date to exactly 3 years ago today | Settings, then open Engagement | You appear in Celebrations as "3-year work anniversary · Today" with a Wish button for colleagues (after the 60 second people cache, or immediately after saving) |
| 261 | Change it to 5 years and 10 years ago | Each | "5-year" / "10-year" milestone cards (🏆); 15 and 20 years likewise; 4, 6 or 9 years show as ordinary anniversary cards (🎊) with the same features |
| 262 | Change it to 6 months ago | Recent date | No anniversary or milestone; no stale card is created |
| 263 | Change it to within the last 14 days | e.g. 4 days ago | You show as "Joined 4 days ago" |
| 264 | Change it away from today's milestone date | After colleagues already wished | Your old card is no longer offered (wishes already sent stay stored against the old date) |
| 265 | Check the milestone uses your date, not account creation | Account created last week, joining date set to 5 years ago | You are shown as a 5-year milestone, not as a new joiner

## A card for every celebration

> Birthdays, every work anniversary (milestone years and ordinary years), and new joiners all get
> the same card: wishes, comments, reactions, tags, and a notification to the person it is for.

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 266 | Open an ordinary anniversary card (for example a 4-year one) on the day | Colleague with a 4-year anniversary today | A dialog titled "<First name>'s 4-year work anniversary 🎊" with the wish form, the wishes, reactions, and the comment box (previously there was no card at all) |
| 267 | Comment on and react to that card | Any comment, 🎉 | Both work; the celebrant is notified ("commented on your anniversary card", "reacted 🎉 to your anniversary card") |
| 268 | Open a milestone card (3, 5 or 10 years) on the day | Colleague at 5 years | Same features, title with 🏆 |
| 269 | Open a new joiner's welcome card | Someone who joined 3 days ago | Title "Welcome <First name>! 👋" with welcome quick messages ("Welcome to the team! 👋", "So glad you're here! 🎉", "Looking forward to working with you! 🚀") |
| 270 | Wish, comment and react on the welcome card | Any | All work; the new joiner gets "welcomed you to the team 👋" for a wish and the usual comment/reaction notifications |
| 271 | Use the card of a new joiner after 14 days | Joined 15 days ago | They are no longer listed; an old link shows the card read-only with the closed note |
| 272 | Open your own card (any kind) when it is open | Own anniversary/welcome/birthday | Highlighted row with "View wishes"; no wish form; you can still comment and react (to say thanks) |
| 273 | Try each card for a day outside its window by API | Comment/react/wish with a date that is not today or the last 3 days | Rejected with `400` ("This card is closed. ...") |
| 274 | Card wording in the Audit Log and notifications | Anniversary and welcome cards | Anniversary cards read "work anniversary card"; welcome cards read "welcome card" |
| 275 | Check that upcoming celebrations are not interactive | Anniversary in 3 days | No button, just "Opens on the day" |

## Comment attachments (photo, short video, GIF)

> Applies to every comment box: comments on posts, and comments on birthday / anniversary /
> welcome cards. One attachment per comment, deliberately small: **a photo up to 1 MB, a clip up to
> 5 MB, or a GIF** from search. (Posts allow far larger files; see the Photo & video section.)

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 276 | Look at a comment box | Open any thread | Next to the text box: a photo/video button, a "GIF" button, and send. Hovering the photo button shows the limits |
| 277 | Attach a JPG, PNG or WebP photo under 1 MB | 600 KB JPG | A small preview with its size and an X appears under the box; sending shows "Uploading..." then the comment with the photo as a small thumbnail |
| 278 | Attach a photo of exactly 1 MB | 1,048,576 bytes | Accepted |
| 279 | Attach a photo over 1 MB | 2 MB PNG named `big.png` | Rejected with a red message: `"big.png" is 2.0 MB, but photos in comments can be at most 1.0 MB. Use the post composer for bigger files.` Nothing is attached |
| 280 | Attach a short MP4, WebM or MOV clip under 5 MB | 3 MB MP4 | Preview with a play icon and size; the sent comment shows a small video player (about 16rem wide) |
| 281 | Attach a video over 5 MB | 6 MB MP4 named `clip.mp4` | Rejected: `"clip.mp4" is 6.0 MB, but videos in comments can be at most 5.0 MB. ...` |
| 282 | Attach a file that is not supported | PDF, GIF file, HEIC, EXE | Rejected: `"x" isn't supported in comments. Use a JPG, PNG or WebP photo, a short MP4, WebM or MOV clip, or pick a GIF.` (GIFs are added through the GIF button, not as files) |
| 283 | Attach an empty file | 0 bytes | Rejected: `"x" is empty.` |
| 284 | Pick a second attachment | A photo, then a clip | The new one replaces the first (only one per comment) |
| 285 | Remove the attachment before sending | Click the X | Preview disappears and nothing is uploaded |
| 286 | Send a comment with only an attachment | No text, a GIF or photo | Allowed: the send button is enabled by text **or** an attachment |
| 287 | Send text plus an attachment | "Look!" + photo | The comment shows the text and the thumbnail below it |
| 288 | Click a photo or GIF in a comment | Thumbnail | Opens the full-size viewer (Esc closes); clips play inline with controls |
| 289 | Check how small the media is | Photo/GIF/clip in a thread | Thumbnails are capped at roughly 9rem tall (clips about 11rem), never filling the thread |
| 290 | Fail the upload | Go offline right after clicking send | An error appears, the comment is not created, and your text and attachment are kept so you can retry |
| 291 | Upload a file over the bucket cap straight to Storage | 2 MB file to `comment-images`, 6 MB to `comment-videos` | Storage itself rejects it, independent of the UI |
| 292 | Submit a comment pointing at someone else's file | `media.path` starting with another user's id | Rejected with `400` "Invalid attachment" |
| 293 | Submit a comment claiming an oversize file | `size_bytes` of 2 MB for a photo | Rejected with `400` "Photos in comments can be at most 1.0 MB" |
| 294 | Send a comment that is rejected after upload | E.g. over 500 characters by API | The uploaded file is removed from Storage (no orphan left) |
| 295 | Delete a comment that has a photo or clip | Own comment | The comment disappears and its file is removed from the `comment-images` / `comment-videos` bucket |
| 296 | Delete a post whose comments have attachments | Post with such comments | The post, its comments, **and** the comment files are removed |
| 297 | Delete an account that posted comment attachments | Disposable account | Their comment photos and clips are removed from Storage |
| 298 | Notification and Audit Log for an attachment-only comment | GIF-only comment | The notification preview reads "Sent a GIF" (or "a photo" / "a video"); the Audit Log reads `Commented on Jane Doe's post: [GIF]`; with text it reads `“text” [photo]` |
| 299 | Attachments in the card dialog | Card comment box | Identical behaviour, including the sizes and messages above |
| 300 | Use the comment box on a phone | 375px width | The text box, photo, GIF and send buttons all fit on one row without sideways scrolling; the attachment preview sits underneath |

## GIF search

> Powered by GIPHY. Needs `GIPHY_API_KEY` on the server. GIPHY's free key allows about 100 calls an
> hour, so results are cached on the server for an hour.

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 301 | Click the "GIF" button | Any comment box | A panel opens with a search box, a "Trending" grid of GIFs, and "Powered by GIPHY" at the bottom |
| 302 | Type a search | "congrats" | After a short pause the grid changes to "Results for “congrats”"; fewer than 2 characters stays on trending |
| 303 | Click a GIF | Any result | The panel closes and the GIF appears as a small preview with an X; sending posts it as a small GIF in the comment |
| 304 | Click "Load more" | Many results | More GIFs are appended without repeating; the button disappears when there are no more |
| 305 | Search for something with no results | Gibberish | A message "No GIFs found for “…”. Try another word." |
| 306 | Clear the search | Click the X in the search box | Returns to trending |
| 307 | Results are workplace-safe | Search a suggestive term | Only G-rated GIFs are returned |
| 308 | Open the panel without a GIPHY key configured | Key missing on the server | A friendly message: "GIF search isn't set up yet. Ask an admin to add a GIPHY API key." and the rest of the comment box keeps working |
| 309 | Hit the provider's hourly limit | Over 100 uncached searches/hour | A message "GIF search is busy right now. Try again in a little while."; repeating a recent search still works (cached) |
| 310 | Search the same thing twice, from two accounts | Identical query | The second is served from the cache (no extra provider call) |
| 311 | Call `GET /api/gifs` without a session | No cookie | `401` Unauthorized |
| 312 | Call it repeatedly | 12+ requests in 10 seconds | `429` "Slow down a little and try again." (when Redis is configured) |
| 313 | Check the API key is not exposed | View page source, network responses, error messages | The key never appears; failures show a generic message |
| 314 | Post a comment with a GIF link from elsewhere by API | `media: { kind: "gif", url: "https://evil.com/x.gif" }` | Rejected with `400` "That GIF isn't allowed"; only GIPHY's own servers (`media*.giphy.com`, `i.giphy.com`, over https) are accepted, and lookalike hosts such as `media0.giphy.com.evil.com` are refused |
| 315 | Pick a GIF in dark mode and light mode | Both themes | Panel, results, and preview remain readable |

## Emoji picker: scrolling, groups, skin tones and modern emojis

| # | Action | Test Data | Expected Result |
|---|--------|-----------|------------------|
| 316 | Open the picker from a post and scroll its list | Mouse wheel / trackpad over the emoji grid | The list scrolls smoothly to the bottom (Team life) and back |
| 317 | Open the picker on a birthday, anniversary or welcome card and scroll | Wish dialog open, click the add-reaction button | The list scrolls with the mouse wheel and trackpad exactly as on a post; the card behind it does not move |
| 318 | Scroll the picker on a touch device inside a card | Phone or touch emulation, swipe up and down over the emoji grid | The grid scrolls under the finger; the page behind and the card do not |
| 319 | Reach the last emoji in each group by scrolling | Scroll to the bottom | Every emoji, including **Salute 🫡** in Feelings and the Team life group at the end, can be reached and picked |
| 320 | Scroll when the list is already at its end | Keep scrolling past the bottom | The list stops at its end (no jump of the page or dialog behind it) |
| 321 | Scroll the GIF results inside a card | Open GIF picker on a card, scroll the results | They scroll the same way |
| 322 | Scroll the tag suggestions inside a card | Type `@` in a card comment | The list of people is scrollable when it is long enough |
| 323 | Pick a reaction on a card after scrolling | Scroll, then click an emoji | The reaction is added to the card and the picker closes |
| 324 | Pick Salute 🫡 on a post, a comment, and a card | Click "Salute" | The reaction is saved on each (a chip "🫡 1" appears, highlighted), survives a reload, and can be removed by clicking the chip |
| 325 | Use the group tabs | Click each small emoji tab above the list | The list scrolls to that group (Appreciation, Feelings, People & gestures, Work, Team life); tabs are hidden while a search is active |
| 326 | Look for the newer "modern" emojis | People & gestures and Feelings groups | Includes 🫶 Heart hands, 🤌 Chef's kiss, 🫰 Finger heart, 🫵 You, 🤷 Shrug, 🤦 Facepalm, 🦸 Superhero, 🫂 Group hug, 🧑‍💻 Developer, 🧑‍🏫 Mentor, 🧑‍🚀 Moonshot, 🧑‍🤝‍🧑 Together, 🥲 Grateful, 🫠 Melting, 🫣 Peeking, 🤩 Starstruck, 🥰 Adore and more (80 in total) |
| 327 | Search for the new emojis | "hug", "heart hands", "developer", "shrug" | Each term finds the matching emoji by name or keyword |
| 328 | Pick a skin tone | Click one of the six dots at the bottom | Hands and people (👍 👏 🙌 🙏 💪 👋 🙋 🫶 🤌 👌 🤞 🤲 🫰 🫵 ✋ 👊 🙇 🤷 🤦 🦸) change to that tone; faces, objects, and joined sequences like 🧑‍💻 do not |
| 329 | React with a toned emoji | 👍 with the medium tone | The reaction is saved and shown as 👍🏽; the same person adding the default 👍 as well gives two separate chips |
| 330 | Reopen the picker later | Close and reopen, or reload | The chosen skin tone is remembered on this device |
| 331 | Open the picker when storage is blocked | Private window with site data blocked | It still works and simply uses the default tone |
| 332 | Highlighting of your reactions | You reacted 👍🏽 | The medium-tone 👍 is highlighted while the tone is set to medium; clicking it removes it |
| 333 | Send an emoji outside the offered set by API | `{ "emoji": "🦄" }`, `"👍👍"`, `"🔥🏽"` (a tone on something that doesn't take one) | Rejected with `400` "Unknown emoji" |
| 334 | Send each offered skin-tone variant by API | `"👍🏻"` through `"👍🏿"` | Accepted |
| 335 | Open the picker on a device whose emoji font is older than the newest emojis | Windows 10, older Android, or an older Linux desktop | Emojis the device cannot draw (for example 🫡, 🫠, 🫶) are left out of the picker instead of showing as empty boxes; everything else is still offered |
| 336 | See a reaction chip whose emoji the device cannot draw | Another person reacted 🫡 on such a device | The chip shows the emoji's name ("Salute") instead of an empty box, with the same count and highlight |
| 337 | Reload the page on such a device | Same | No hydration warning in the console and the chips settle to the name fallback |
| 338 | Check the picker size | Any | It is about 21rem wide and no taller than 18rem plus tabs and footer, and stays inside a 375px screen with margins |
| 339 | Use the picker in dark mode | Dark theme | Tabs, group titles, the highlight, and the skin-tone dots (with the selected one ringed) are all readable |
| 340 | Use the keyboard | Tab through the picker | Search, group tabs, emojis and skin-tone dots all take focus with a visible ring; Esc closes the picker |
