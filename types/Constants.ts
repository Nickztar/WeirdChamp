export const AWS = {
    S3_BUCKET: "weirdchamp",
    API_VERSION: "2006-03-01",
    REGION: "eu-north-1",
};

export const ExpressConst = {
    WHITELIST: [
        "http://localhost:3000",
        "https://weirdchamp-next.vercel.app",
        "https://weirdchamp.wtf",
        "https://www.weirdchamp.wtf",
        "https://dev.weirdchamp.wtf",
        "https://weirdchamp.vercel.app",
        "https://www.weirdchamp.vercel.app",
    ],
};

export const regYoutube =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
