import mongoose from "mongoose";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
async function dbDisconnect() {
    // check if we have a connection to the database or if it's currently
    // connecting or disconnecting (readyState 1, 2 and 3)
    if (mongoose.connection.readyState == 0) {
        return;
    }

    return mongoose.disconnect();
}

export default dbDisconnect;
