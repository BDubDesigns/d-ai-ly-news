# Daymark — daily AI & American politics brief

Daymark is a mobile-first newspaper reader for a daily, source-linked edition about AI and U.S. politics. The reader displays dated JSON editions, preserves past editions in an archive, and can read a single story or the full paper aloud.

> The checked-in edition is **sample copy for the layout only**. It is not current reporting and its `example.org` links are placeholders.

## What is here

- A responsive editorial reader with a lead story, two section desks, source links, and a dated archive.
- Browser/device speech playback for an individual article or the full edition, with pause, resume, replay, and stop controls. The app does not call a paid text-to-speech service; available voices depend on the browser and Android device.
- A simple JSON archive format designed for a later AndroidHarness daily automation.
- No Tavily key, model key, backend, or generated daily content is included yet.

## Run locally

Requires Node.js and npm:

```sh
npm install --no-bin-links
npm run dev
```

Build the production bundle with `npm run build`; `npm run preview` serves that bundle locally.

## Archive format

`public/data/manifest.json` lists editions newest first. Each `file` points to a dated JSON snapshot under `public/data/editions/`.

To add an edition, create `public/data/editions/YYYY-MM-DD.json` from the sample schema, then prepend its date, title, path, story count, and sample flag to the manifest. Keep older files and entries so the archive remains available; do not overwrite earlier editions as part of the daily run.

An edition contains a `date`, `isSample`, `leadArticleId`, and `sections`. Each article has an `id`, `title`, `summary`, and optional `dek`, `whyItMatters`, `readingMinutes`, and `sources` (`title` + `url`). Full-edition audio follows section order; citations remain links and are not spoken as raw URLs.

## Automation and privacy

The daily generator is a follow-up step: search, summarize with source citations, write a new dated JSON file, then prepend it to the manifest. Store the Tavily key in AndroidHarness secure secret settings if available—never in the prompt or committed JSON.

This GitHub repository is **public**. Any real editions pushed here would also be public. Keep daily output on-device unless you explicitly want to publish the archive.
