export interface PostRequest {
    success: boolean;
    Error?: Error;
    data?: DataResponse;
}
export interface DataResponse {
    signedRequest: string;
    url: string;
}

export interface IS3Params {
    Bucket: string;
    Key: string;
    Expires: number;
    ContentType: string;
    ACL: string;
}
