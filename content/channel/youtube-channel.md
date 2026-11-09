# YouTube channel — Dash & Newt

## Brand

| | |
|---|---|
| Channel name | **Dash & Newt** |
| Handle | **@DashAndNewt** (backups if taken: `@DashNewt`, `@DashAndNewtShorts`, `@dash.and.newt`) |
| Tagline | *brute force vs. physics* |
| Dash | Orange scarf. Plays dumb — presses the button, takes the shortcut, hits snooze. |
| Newt | Party hat. The physics genius (named after Isaac Newton). Wins with physics, then shares. |
| Colours | Dash orange `#ff8a1f` · Newt pink-red `#ff4d6d` · chalkboard `#2f4a3c` · chalk `#f4f1e6` |
| Assets | `out/channel/avatar.png` (800×800) · `out/channel/banner.png` (2560×1440, safe area respected) — re-render with `npx remotion still ChannelAvatar|ChannelBanner` (`src/channel/ChannelArt.tsx`) |

## Description, keywords, playlists, layout

All profile copy for YouTube, Instagram and Facebook lives in **[channel-setup.md](channel-setup.md)**:
the SEO-tuned channel description, keywords, playlist descriptions, layout, links and watermark,
each checked against its limit (`node tools/publish/check-channel-copy.mjs`).

| Playlist (exact titles, used by the publisher) |
|---|
| **Dash & Newt — All Episodes** |
| **Newton Was Right** |
| **Dash's Worst Ideas** |

## Upload defaults (Settings → Upload defaults)

- **Title:** `[hook] | Dash & Newt #Shorts`
- **Description:**
  ```
  [one-line hook]

  Dash & Newt — brute force vs. physics. Funny stickman shorts with real physics and zero dialogue.
  🔔 Subscribe for a new short every week.

  #shorts #stickman #funnyanimation
  ```
- **Tags:** `stickman, stickman animation, funny animation, animated shorts, dash and newt, physics comedy, cartoon shorts`
- **Category:** Comedy · **Language:** English · **Licence:** Standard YouTube · **Comments:** on
- **Altered or synthetic content:** "No" — these are clearly stylised cartoons, not realistic people, places or events.

## Audience setting ("made for kids") — your decision

YouTube requires you to say whether the channel/videos are **made for kids** (COPPA). Cartoons with a
child character can be judged kid-directed. If children are your *primary* audience you must say
**Yes** — that turns off comments, notifications and personalised ads (much lower revenue). If you
make comedy for a general audience (teens/adults, relatable humour), **No** is appropriate; keep
titles, tags and thumbnails aimed at a general audience (avoid "for kids", nursery-style wording).

## Monetisation checklist

- YouTube Partner Program for Shorts has had two tiers: a fan-funding tier (around 500 subscribers +
  3M Shorts views in 90 days) and full ad revenue (1,000 subscribers + 10M Shorts views in 90 days, or
  4,000 public watch hours). Check the current numbers in **YouTube Studio → Earn** before planning.
- Every sound in the reels is original (`tools/sfx/`), no voice, no copyrighted music → no Content ID claims.
- Upload only the re-rendered, monetisation-safe versions of episodes 1–3 (original sound kit).
- Post on a steady schedule (e.g. same weekday + time) and reply to early comments.

## Set-up steps (≈10 minutes, you do the clicks)

1. Sign in to YouTube with the Google account that should own the channel.
2. Create the channel as a **Brand Account** (Settings → *Add or manage your channel(s)* → *Create a
   channel*). It isn't tied to your personal name and lets you add managers/apps later — needed for
   automated publishing.
3. Name **Dash & Newt**, handle **@DashAndNewt** (or a backup).
4. YouTube Studio → **Customization → Profile**: upload `avatar.png` and `banner.png`, then paste the
   description and links from `channel-setup.md`. Add a business contact email.
5. **Settings → Channel → Basic info**: keywords (from `channel-setup.md`), country. **Advanced settings**: audience (see above).
6. Verify the channel at **youtube.com/verify** (phone) — unlocks custom thumbnails and longer uploads.
7. **Settings → Upload defaults**: paste the defaults above.
8. Create the three playlists, with the descriptions from `channel-setup.md`.
9. Upload episodes 1–3: review and approve `content/publish/epNN-slug.yaml`, then `npm run publish`
   (setup in `docs/PUBLISHING.md`). Pick each Short's cover frame in the YouTube mobile app.
