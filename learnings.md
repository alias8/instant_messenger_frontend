# Learnings

## WebSocket message fan-out threshold

The current code in `MessageService.ts` uses 100 members as the threshold between two fan-out strategies:

- **Under 100 members** — publish a `user:<userId>` Redis event for each recipient individually. The full message payload is included, so the client displays it immediately with no extra round trip.
- **100+ members** — publish a single `conversation:<id>` event. Clients receive a notification that new messages exist and fetch them separately. Cheaper on Redis and server resources, but slower to deliver due to the extra HTTP fetch.

### Why 100 is arbitrary

The threshold was not derived from measurement — it is a reasonable-sounding guess. In a real system you would determine it by:

1. Load testing both approaches at different conversation sizes, measuring Redis publish latency, server CPU, and memory under realistic concurrent load.
2. Profiling where the actual bottleneck is first — it may be the PostgreSQL write or Elasticsearch index rather than the fan-out, making this optimisation premature.
3. Starting with per-user fan-out for all conversations, watching production metrics, and only introducing the split when real data shows it is needed at a specific scale.

The right threshold is system-specific. Slack and Discord would have found theirs through years of production data at genuine scale.
