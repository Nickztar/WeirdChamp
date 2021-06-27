import { AWS } from "../types/Constants";
import aws from "aws-sdk";
import { IS3Params, PostRequest } from "../types/AwsTypes";
import { s3 } from "../src/discord";

export const getS3Files = async () => {
    return new Promise<aws.S3.Object[]>((resolve, reject) => {
        s3.listObjects({ Bucket: AWS.S3_BUCKET }, function (err, data) {
            console.log(err);
            if (err || !data) reject();
            const files: aws.S3.Object[] = [];
            data?.Contents?.forEach(function (file, index) {
                files.push(file);
            });
            resolve(files);
        });
    });
};

export function getS3Url(key: string) {
    const url = s3.getSignedUrl("getObject", {
        Bucket: AWS.S3_BUCKET,
        Key: key,
        Expires: 60,
    });
    return url;
}

export const getSignedPost = async (s3Params: IS3Params) => {
    return new Promise<PostRequest>((resolve, reject) => {
        s3.getSignedUrl("putObject", s3Params, (err, data) => {
            if (err) {
                console.log(err);
                reject({ success: false, error: err });
            }
            // Data payload of what we are sending back, the url of the signedRequest and a URL where we can access the content after its saved.
            const returnData = {
                signedRequest: data,
                url: `https://${AWS.S3_BUCKET}.s3.amazonaws.com/${s3Params.Key}`,
            };
            // Send it all back
            resolve({ success: true, data: returnData });
        });
    });
};
