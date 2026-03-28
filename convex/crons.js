import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "purge posts older than 2h",
  { minutes: 15 },
  internal.posts.purgeExpiredPosts,
);

export default crons;
