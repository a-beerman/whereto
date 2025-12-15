# Bot Copy (RU)

## /plan (group)
**Bot:** When?
- Buttons: Today / Tomorrow / Pick date

**Bot:** Time?
- Buttons: 18:00 / 19:00 / 20:00 / Other

**Bot:** Area?
- Buttons: Near me / Pick district / Skip

**Bot:** Budget?
- Buttons: $ / $$ / $$$

**Bot:** Format?
- Buttons: Dinner / Bar / Coffee

**Bot:** How much time for voting?
- Buttons: 1h / 2h / 3h / 6h

### Plan message
"Plan created: {date} {time}, {area}, budget {budget}, format {format}. Press Join to participate."

Buttons:
- Join
- Preferences
- Show options (initiator; when join >= 2)
- Cancel (initiator)

## Voting
"Pick a place. Vote is one-shot. Voting until {endsAt}."

### Repeat click
"Your vote is already counted. You cannot change it."

## Timeout no votes
"Looks like nobody voted in time  
recommending **{top1}**. Want to revote?"

Buttons:
- Keep recommendation (initiator)
- Revote (initiator)
