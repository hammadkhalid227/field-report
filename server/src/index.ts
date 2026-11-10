import "dotenv/config";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);

createApp().listen(port, "0.0.0.0", () => {
  console.log(`listening on ${port}`);
});
