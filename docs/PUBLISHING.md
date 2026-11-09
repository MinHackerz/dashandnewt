# Publishing — review-gated uploads to YouTube, Instagram and Facebook

Rendered episodes go out through `tools/publish/` (Node, no SDKs: plain HTTPS calls to the official
APIs). **Nothing is posted until you have reviewed and approved that episode.**

```
render ──► publish:prepare ──► you review/edit ──► publish:approve ──► publish (--dry-run first)
           content/publish/      the .yaml           pins video +        YouTube · Instagram · Facebook
           epNN-slug.yaml        (status: draft)     metadata hashes     results written back to the .yaml
```

## Commands

| Command | What it does |
|---|---|
| `npm run render -- TheButton` | Renders, then drafts `content/publish/ep01-the-button.yaml` if it doesn't exist yet. |
| `npm run publish:prepare -- ep01` | Generates the draft from the episode sheet's **Publish brief**. `--all` for every episode, `--force` to regenerate a draft (refused once anything was posted). |
| `npm run publish:approve -- ep01` | Prints every title, description, tag, caption and the video's specs, then asks you to type `ep01`. Records `status: approved` plus fingerprints of the video file and the metadata. `--revoke` goes back to draft. Only works in a real terminal. |
| `npm run publish -- ep01 --dry-run` | Shows every API request in order (secrets redacted), exactly as it would be sent. Sends nothing and changes no files. Works without any credentials. |
| `npm run publish -- ep01` | Uploads to every platform in `platforms:`. `--platform youtube` (or `instagram`, `facebook`, comma-separated) limits it. |
| `npm run publish:status` | One line per episode: status, per-platform state, and what is blocking it. |
| `npm run publish:auth -- youtube \| meta \| check` | One-time credential setup and a read-only check. See below. |
| `npm run publish:test` | Offline tests against a fake API (gate, dry run, idempotency, crash recovery). |

Episodes can be named `ep01`, `1`, `the-button`, `TheButton` or `ep01-the-button`.

## The review gate

`publish` refuses to send anything unless all of these hold:

1. `status:` is `approved` (or `published`, when a platform is still pending).
2. The video file's SHA-256 still matches the one recorded at approval. A re-render means you approve again.
3. The metadata (titles, descriptions, tags, caption, platforms…) still matches what you approved.
   Edit after approving? Approve again.
4. Every platform limit is met (title ≤ 100 chars, tags ≤ 500 chars, caption ≤ 2,200 chars, 9:16, 3–90 s…).

Setting `status: approved` by hand also works. There is no fingerprint then, so later edits or
re-renders can't be detected and `publish` warns. Prefer `publish:approve`.

**Never posted twice.** Each step writes its IDs into `results:` as soon as it gets them. A re-run
skips finished platforms and resumes unfinished ones:

- **YouTube:** an upload interrupted after YouTube accepted it is found in the channel's uploads by title.
- **Instagram:** an existing container is reused, or found already published by its caption.
- **Facebook:** the reel resumes at the byte offset Meta reports.

A platform that fails doesn't stop the others. Fix the cause and run `publish` again.

**Uploaded by hand?** Mark that platform as done so it's never posted again: under `results:`, add
`youtube:` (or `facebook:` / `instagram:`) with `state: published`, `manual: true` and `url:` set to
the post's link. `publish` then skips it, and `publish:status` shows ✓.

## The publish file (`content/publish/epNN-slug.yaml`)

```yaml
episode: ep01-the-button
status: draft            # draft → approved (publish:approve) → published (all platforms done)
video: out/the-button.mp4
platforms: [youtube, instagram, facebook]   # remove one to skip it (then approve again)
youtube:   { title, description, tags, category, playlists, privacy, made_for_kids, synthetic_media, language }
instagram: { caption, cover_frame_s, alt_text, share_to_feed }
facebook:  { title, description }
approval:  { by, at, platforms, video_sha256, metadata_sha256 }
results:   { youtube: { id, url, playlists, … }, instagram: { container_id, media_id, url, … }, facebook: { video_id, url, … } }
```

Edit the text freely before approving. To change the copy for good, edit the episode's **Publish
brief** (`content/episodes/epNN-slug.md`) or the channel defaults
(`content/channel/publish-defaults.yaml`) and run `publish:prepare -- epNN --force`.

### How the copy is built

| Platform | Built from |
|---|---|
| YouTube Shorts | Title: `hook` + ` \| Dash & Newt #Shorts`. Description: `story`, `question`, moral, channel footer, then `#shorts #stickman #funnyanimation` + episode `hashtags` (5 max). Tags: channel tags + `keywords`, trimmed to YouTube's 500-char count. Category Comedy. Playlists: All Episodes + `playlists`. |
| Instagram Reels | `instagram.hook` → `instagram.story` → `instagram.question` → `tag_friend` + follow line → 📌 moral → exactly 5 `instagram.hashtags`. Cover: `cover_s` (sent as `thumb_offset`). Alt text is kept for you to paste: the API can't set alt text on Reels. |
| Facebook Page Reels | Title: `hook`. Description: `story`, `question`, moral, page footer, 3 hashtags (episode's first + `#stickman #dashandnewt`). |

The moral comes from the sheet's `**Moral:**` line. A new episode needs a **Publish brief**: copy
one from `content/episodes/ep03-the-shortcut.md`.

## One-time setup

You create the accounts, apps and tokens yourself. The tools only read them from `.secrets/` (git-ignored):
settings in `.secrets/publish.env`, tokens in `.secrets/*.json`. Not `.env`/`.env.local`: Remotion loads
those into the Studio and render bundle, which would expose the Meta app secret to the browser page. Never paste a token, secret or password into a chat with an
assistant. The only place a token is typed is the hidden prompt of `npm run publish:auth -- meta`
in your own terminal.

Fill in `.secrets/publish.env`. If it's missing, copy the template:

```bash
mkdir -p -m 700 .secrets && cp tools/publish/publish.env.example .secrets/publish.env && chmod 600 .secrets/publish.env
```

### YouTube (Google Cloud OAuth, installed-app flow)

1. Create the channel as a **Brand Account** (`content/channel/youtube-channel.md`). Create the three
   playlists with the exact titles from `content/channel/publish-defaults.yaml`.
2. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project, e.g. "Dash & Newt publisher".
3. **APIs & Services → Library**: enable **YouTube Data API v3**.
4. **Google Auth Platform → Branding / Audience** (the OAuth consent screen):
   - User type **External**. Fill in the app name and your support email.
   - Under **Data access**, add the scopes `https://www.googleapis.com/auth/youtube.upload` and
     `https://www.googleapis.com/auth/youtube`. The second one is needed to add videos to playlists.
   - Add your Google account as a **test user**.
   - Then click **Publish app** ("In production"). In Testing status, refresh tokens expire after
     7 days. An unverified app that only you use works fine; click through the "Google hasn't verified this app" warning.
5. **Clients → Create client → Desktop app.** Download the JSON to `.secrets/youtube-client.json`.
6. Run this and pick the **Dash & Newt** channel when Google asks:
   ```bash
   npm run publish:auth -- youtube
   ```
   It opens Google sign-in, catches the redirect on `127.0.0.1`, and saves a refresh token to
   `.secrets/youtube-token.json`. Put the printed channel ID in `.secrets/publish.env` as `YOUTUBE_CHANNEL_ID`.

**Private-only uploads (important).** YouTube locks videos uploaded through API projects that
haven't passed its compliance audit to **private**. This applies to projects created after July 2020.
`publish` warns when YouTube returns a privacy other than the one you asked for. To publish
publicly through the API, submit the **YouTube API Services – Audit and Quota Extension Form**
(linked from the YouTube Data API docs, "Quota and compliance audits") for this project. Until it
passes, take `youtube` out of `platforms:` and upload Shorts by hand with the copy from the publish file.
Instagram and Facebook are not affected.

**Quota.** Uploads draw on the project's daily Data API quota. See *APIs & Services → YouTube Data API v3 → Quotas*.
A few uploads a day is well within the default.

### Meta: Facebook Page + Instagram (Graph API, Facebook Login for Business)

1. **Accounts.** You need a Facebook **Page** for Dash & Newt, and the Instagram account switched to a
   **professional account** (Creator or Business) and linked to that Page. In Instagram, go to
   Settings → Account type and tools. Link it in Page settings → Linked accounts, or in Meta Business Suite.
2. **App.** At [developers.facebook.com](https://developers.facebook.com) → My Apps → Create app,
   add the use cases **"Manage everything on your Page"** and **"Manage messaging & content on
   Instagram"** (Instagram API with Facebook Login). You are the app's admin, so its permissions work for
   your own Page and Instagram without App Review. Fill in the basic settings (privacy-policy URL, icon,
   category) and switch the app to **Live**. Posts made by apps in Development mode can be hidden
   from the public.
3. Put **App ID** and **App secret** (App settings → Basic) into `.secrets/publish.env` as `META_APP_ID` / `META_APP_SECRET`.
4. **Token.** Open the [Graph API Explorer](https://developers.facebook.com/tools/explorer/), select
   *your* app, choose **User Token**, and add these permissions:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`,
   `instagram_content_publish`. Also add `business_management` if the Page is owned by a Business portfolio.
   Click **Generate Access Token**, and in the dialog select the Dash & Newt Page and Instagram account.
5. In your terminal run the command below and paste the token at the hidden prompt:
   ```bash
   npm run publish:auth -- meta
   ```
   It exchanges the token for a long-lived one and derives the **Page access token**. Page tokens
   derived this way don't expire. It finds the linked Instagram account ID and saves everything to
   `.secrets/meta.json`. If you manage several Pages, set `META_PAGE_ID` in `.secrets/publish.env` first.
6. Confirm everything without posting:
   ```bash
   npm run publish:auth -- check
   ```

**Instagram video hosting.** By default, nothing is hosted anywhere. Instagram's *resumable upload*
sends the local file straight to Meta (`rupload.facebook.com`), the same way Facebook Reels uploads
work. The publisher first makes a lossless "faststart" copy in `out/publish/`, because Instagram
needs the MP4 index at the front. If you'd rather have Meta fetch the file from a host you control,
set `IG_VIDEO_BASE_URL` to that public HTTPS folder and copy the `out/publish/…mp4` file shown by
`--dry-run` there yourself. The tools never upload to a third-party host.

## When tokens expire or break

| Symptom | Fix |
|---|---|
| YouTube `invalid_grant` | The refresh token expired (app still in *Testing*: 7 days) or was revoked. Publish the consent screen, then run `npm run publish:auth -- youtube` again. |
| Meta error code 190 / "session has expired / invalidated" | The Page token is invalid (password change, app removed, permissions changed). Generate a new Explorer token and run `npm run publish:auth -- meta`. |
| Meta "permission" errors (#10, #200) | A permission is missing. `publish:auth -- check` lists them; regenerate the Explorer token with all of them ticked. |
| YouTube video stuck private | The audit restriction above. |
| `playlist "…" not found` | Create it with that exact title, then run `publish` again. Only the playlist step runs. |
| Instagram container `ERROR` | Usually the file format. Check `npm run publish -- epNN --dry-run` specs, then re-run; a fresh container is created. |
| `the video changed since approval` | You re-rendered. Review the new file and run `publish:approve` again. |

## Platform limits the validator checks

| | YouTube Shorts | Instagram Reels | Facebook Reels |
|---|---|---|---|
| Length | ≤ 3 min | 3 s – 15 min | 3 – 90 s |
| Format | vertical | 9:16, 23–60 fps, ≤ 300 MB | 9:16, 24–60 fps |
| Text | title ≤ 100 chars (≤ 70 shows fully), description ≤ 5,000 bytes, tags ≤ 500 chars, no `<` `>` | caption ≤ 2,200 chars, ≤ 30 hashtags (house style: 5), ≤ 20 mentions | — |
| API posting limit | daily project quota | 100 posts / 24 h | 30 posts / 24 h |

## Rules for assistants working in this repo

- Never set `status: approved`, never run `publish:approve`, and never run `publish` without
  `--dry-run` unless the user asked for that specific episode in this conversation.
- Never ask for, read, print or commit anything in `.secrets/` (or `.env`/`.env.local`).
