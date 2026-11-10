import { config } from "dotenv";
import { createApp } from "./app";

config({ quiet: true });

const port = Number(process.env.PORT ?? 4000);

createApp().listen(port, "0.0.0.0", () => {
  console.log(`listening on ${port}`);
});
