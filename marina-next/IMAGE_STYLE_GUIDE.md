# Marina-Next — In-Game Image Style Guide

Photorealistic chat-attachment aesthetic. Telegram-style. NOT brand material.

## Design archetype

**Diegetic chat photo** — looks like a real picture sent in a Telegram message. NOT poster art, NOT brand visual. Should disappear into the messenger UX.

## Required properties

| Property | Value |
|---|---|
| Format | WebP, quality 85 |
| Dimensions | 832x1216 (vertical 2:3) — Pollinations may downscale to 635x928, accept |
| Aspect | 2:3 vertical (matches mobile chat bubble) |
| File size | 25-90KB target |
| Look | Photorealistic; cartoon and illustration not allowed |
| Aesthetic | Documentary, smartphone-camera, candid |

## Composition rules

- Subject fills 50-70% of frame
- Top-down or 45-degree angle (smartphone-natural)
- Available light only — no studio setup
- Slight blur OK (real phones have it)
- NO heavy bokeh (suggests staged photography)

## What to AVOID

- ❌ Generic stock photo aesthetic (smiling people, handshakes, laptops on desks)
- ❌ Cartoon, illustration, sketch
- ❌ **Neon signs, glowing symbols, red lights** (Pollinations FLUX trigger word avoidance)
- ❌ Heavy bokeh / shallow DOF
- ❌ Corporate / agency mood
- ❌ Pastel soft colors
- ❌ Flowers, sunset beach, food close-ups (overdone)
- ❌ Logos, watermarks, brand marks

## Per-character palette hints

| Character | Palette / Mood |
|---|---|
| Tim | Warm coral / Mediterranean (Каш view) |
| Kirill | Blue, calm, restrained |
| Khozyaika | Warm yellow interior / vintage Soviet |
| Mama | Soft warm / pies / kitchen |
| Denis | Golden / luxury / high-key |
| Anna | Bright, modern, business-like |
| Lena | Warm coffee / cozy |
| Crisis (hangover, hungry) | Cold-blue tones, desaturated |

## Negative prompt template

Always append to generation request:
```
no neon signs, no glowing symbols, no red lights, no cartoon, no illustration,
no heavy bokeh, no smiling stock-photo people, no corporate handshakes,
no logos, no watermarks, photorealistic only, smartphone snapshot aesthetic
```

## QA checklist (before wiring)

For each generated image:
- [ ] No distorted hands (FLUX failure mode)
- [ ] No garbled text artifacts (if text in scene, must be readable or absent)
- [ ] Subject matches narrative (not random unrelated content)
- [ ] No NSFW content
- [ ] Crop-safe — important content in central 80% (bubble may crop edges)
- [ ] Aesthetic matches tone (crisis → cold/dark, sweet → warm/soft)

## Provider policy

**Primary (when available):** OpenRouter → Gemini 2.5 Flash Image (Nano Banana)
- Better text rendering, fewer hand artifacts
- Requires valid OpenRouter credentials (env var)
- Currently UNAVAILABLE — key revoked, awaiting Tim refresh

**Fallback (current):** Pollinations.ai FLUX
- Free, no API key
- ⚠ Often ignores width/height parameters
- ⚠ Symbol/text rendering weak
- ⚠ Susceptible to "neon" hallucination on certain prompts
- ⚠ No SLA / commercial-use clarity
- Use ONLY for non-brand narrative chat photos

## Pollinations FLUX prompt patterns that work

Tested in SPRINT 14.3 + SPRINT 16:

✅ "Photorealistic [subject] on [surface], [camera angle], [lighting], [mood]"
✅ Triple-emphasizing "no neon, no red lights, no symbols" prevents abstract output
✅ Ending with "Vertical 832x1216" — not always honored but signals intent

## Pollinations FLUX prompt patterns that FAIL

❌ Single-word abstract concepts ("damage", "broken")
❌ Asking for readable text ("receipt with $150 visible")
❌ Russian-only prompts (English better)
❌ Multiple subjects in one frame
