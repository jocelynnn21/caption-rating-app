# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a college student who is online frequently, relatively new to New York City, and looking for interesting things to discover on weekends.

## Product Purpose

POPUP.NYC combines a curated guide to real limited-time New York events with a participatory AI concept feed. Success means visitors can quickly find real events, while signed-in members can reveal and vote on playful fictional pop-up concepts without writing prompts.

## Positioning

The product keeps verified event discovery and clearly labeled AI speculation side by side: Explore is for real events; Daily Drop is a community signal for imaginary collaborations people would actually attend.

## Operating Context

Visitors browse real pop-ups and public AI concepts. Signed-in members save events, maintain a profile, generate up to five automatically prompted AI concepts per day, and vote “I’d go” or “Skip.”

## Capabilities and Constraints

- Google OAuth, profiles, avatar upload, and protected member routes already exist and must keep working.
- AI concepts require no free-form user input; the system constructs and stores the prompt.
- AI concepts must be unmistakably labeled as fictional and must never be presented as real listings.
- Votes and generations are stored in Supabase and protected with row-level security.
- Secrets remain server-side and must never be committed.

## Brand Commitments

The product name is POPUP.NYC. Its established interface is a minimal, warm-white editorial layout with strong typography, black rules, compact uppercase utility copy, and generous spacing.

## Evidence on Hand

The repository contains the working Explore, login, saved, and profile surfaces plus a Supabase-backed `popups` table. No testimonials, commercial partnerships, or verified demand claims are available and none should be fabricated.

## Product Principles

- Participation should take one click, not prompt-writing expertise.
- Clearly separate real-world listings from generated concepts.
- Make each vote express a useful preference: would someone actually go?
- Add only features that support discovery, generation, or voting.
- Treat authentication and ownership rules as product behavior, not implementation details.
