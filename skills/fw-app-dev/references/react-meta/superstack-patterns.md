# Superstack patterns

Reference app: [github.com/freshworks-developers/superstack](https://github.com/freshworks-developers/superstack)

Official documentation demo for Meta framework — Tailwind, MUI, Redux, multi-placeholder, custom iparams React.

## Patterns to borrow (not copy wholesale)

| Pattern | Detail |
|---------|--------|
| Tailwind route | `/app/tailwind` feature page |
| MUI page | Separate route for Material UI demo |
| Redux | Global state for demo navigation |
| Multi-placeholder | Multiple HTML shells at `app/` root |
| iparams React | `config/iparams.html` + `config/assets/components/` — see `custom-iparams.md` |

## Routing

```jsx
<Route path="*" element={<Home />} />
<Route path="/app/tailwind" element={<TailwindPage />} />
```

## License

Superstack is UNLICENSED — link and learn patterns; do not copy large code blocks into marketplace apps without review.
