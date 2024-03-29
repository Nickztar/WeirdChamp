import mongoose from "mongoose";
import * as config from "../bot.config";
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
async function dbConnect() {
    // check if we have a connection to the database or if it's currently
    // connecting or disconnecting (readyState 1, 2 and 3)
    if (mongoose.connection.readyState >= 1 || !config.USE_AWS) {
        return;
    }

    return mongoose.connect(config.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
    });
}

export default dbConnect;
