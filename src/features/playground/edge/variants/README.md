# Wave Edge Variant

`WavePlaygroundEdge` preserves the previous animated active-edge implementation.
It is intentionally not registered, so the playground continues to use the default `PlaygroundEdge`.

To reactivate it, import `WavePlaygroundEdge` in `PlaygroundCanvas.tsx` and assign it to the
`playground` key in `edgeTypes`.
