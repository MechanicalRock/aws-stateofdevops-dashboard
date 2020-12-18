import { StateChangeCapture } from "./stateChangeCapture";
import { CloudwatchStateChangeEvent } from "./interface.d";

export async function handler(event: CloudwatchStateChangeEvent): Promise<void> {
    await new StateChangeCapture().run(event);
}
