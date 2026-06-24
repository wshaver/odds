# Modern Poker Table Styling Design

## Goal

Replace the current dark-background panel layout with a modern poker-table trainer UI. The redesign should make the hand state feel like it is on a table, keep answer actions easy to reach, and leave room for additional trainer modes without another layout rewrite.

## Scope

This pass is styling and layout focused. It should use CSS and existing card text rendering, with no image assets. The existing prompt generation, answer calculation, feedback logic, and route behavior remain unchanged.

Out of scope:

- Hidden or face-down opponent cards.
- New training modes.
- New poker engine behavior.
- Image-based felt, cards, chips, or table assets.

## Layout

The main screen has four regions:

1. Top bar: app title, mode selector, and mode progress.
2. Table stage: CSS poker table containing opponent cards, board cards, pot/status badges, and hero cards.
3. Action pad: answer buttons for the active mode, positioned at the bottom-right of the table area on desktop.
4. Feedback strip: post-answer details, positioned along the lower-left/lower edge of the table area.

The current two-panel prompt/answer layout should be replaced by semantic table regions inside `TrainerView`.

## Top Bar And Modes

The mode selector is a first-class control in the top bar. It should support the current `Odds` and `Bet` modes and visually scale to more modes later.

Desktop behavior:

- Render modes as segmented tabs or compact pill buttons.
- Make the active mode obvious with stronger contrast and a chip/felt-like selected state.
- Keep progress visible near the selector, either beside the active mode or as compact per-mode counters.

Mobile behavior:

- Keep mode switching at the top.
- Use a compact wrapping or horizontally scrollable segmented control if future modes exceed available width.

Mode selection must remain visually distinct from answering the current prompt.

## Table Stage

The table is the main visual anchor:

- A large green felt oval on desktop.
- A tall rounded felt surface on mobile.
- CSS gradients and shadows create felt depth, rim, and subtle texture.
- The rim should feel modern and restrained, using dark wood or bronze tones without glossy casino-client styling.

Card placement:

- Opponent hand is visible near the upper-left or upper rail.
- Board cards are centered on the felt.
- Hero hand is near the bottom-center rail.
- All playing cards use the same fixed size.
- Board cards may be centered as the highest-priority card group, but not made larger than opponent or hero cards.

Badges:

- Pot and mode-specific values sit near the board.
- Odds mode can show a compact `Win chance ?` or equivalent status badge.
- Bet mode shows `Pot`, `Call`, and any relevant calculated context after answering.
- Badge styling should resemble table/chip indicators without requiring image assets.

## Action Pad

The action pad sits at the bottom-right of the table area on desktop and below the main card groups on mobile.

Odds mode:

- Show the three percentage answer choices.
- Keep button sizes stable so result states do not shift the table.

Bet mode:

- Show fold/call choices using the same action pad shell.
- Labels should remain short and clear.

After answering:

- Preserve the current behavior of showing the selected and correct choices.
- Use clear correct/incorrect visual states.
- Show `Next` as the primary action in the same action area.

## Feedback

Before answering, feedback should be hidden or minimal. After answering, show a compact dealer-readout style strip with:

- Correct or incorrect result.
- Win outs.
- Pushes.
- Remaining cards.
- Exact win chance.
- Required equity and max correct call in bet mode.
- Existing winning-cards reveal behavior when applicable.

The feedback strip must not compete with the answer buttons before the user answers.

## Visual Style

Use a dark room background with the table as the bright focal point.

Cards:

- Crisp white card faces.
- Clear red and black suit colors.
- Fixed dimensions and stable spacing.
- Small shadows for lift from the felt.

Controls:

- High contrast.
- Compact and readable.
- Modern trainer feel, not glossy legacy poker-client chrome.

Avoid:

- Nearly black blank backgrounds with white panels.
- Image dependencies.
- Oversized decorative UI.
- One-note monochrome green styling.

## Responsive Requirements

Desktop:

- Table is wide and oval.
- Board stays centered.
- Action pad is bottom-right.
- Feedback appears along the lower table area without overlapping cards or actions.

Mobile:

- Table becomes a tall rounded felt surface.
- Opponent, board, hero, actions, and feedback stack in a readable vertical flow.
- Cards remain the same size within a viewport when possible, then scale only if necessary to avoid horizontal overflow.
- Mode selector remains available at the top.

## Testing And Verification

Run existing tests after implementation. Update component tests only where markup changes alter queries or accessible names.

Manual visual checks should cover:

- Odds mode before answering.
- Odds mode after correct and incorrect answers.
- Bet mode before and after answering.
- Desktop width around 1280px.
- Mobile width around 390px.
- Longer future mode labels do not break the top bar.
