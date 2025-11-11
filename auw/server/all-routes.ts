import { composeRoutes } from "auwsomebridge";
import { userRoutes } from "./routes/user";

export const allRoutes = composeRoutes(userRoutes);
