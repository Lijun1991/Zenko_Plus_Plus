# fillit
Zenko Multi-Cloud Data Storage Open Source — JavaScript, Node.js, Docker, AWS, Google Cloud Platform
Project turn your own machine into a server to store data in Google Cloud Platform use aws methods. Make buckets, save/retrieve/delete data in Google Cloud Platform directly from your local machine. Built on top of S3 server.

Set up your AWS/Google Cloud Platform account if you don't have one.

```
export GOOGLE_APPLICATION_CREDENTIALS=your_Google_Cloud_Platform_keyfile.json_Path
export GCLOUD_PROJECT=your_Google_Cloud_Platform_projectName
export SCALITY_SECRET_ACCESS_KEY=your_AWS_access_key
export SCALITY_ACCESS_KEY_ID=your_AWS_access_key_id
```

## Implementation

Create a main bucket as 'your_bucket_name'on Google Cloud Platform to store all data
Change file bucket name as yours in dataserver.js line 19 (will set to env virable in future improvement)

```
const bucket = 'your_bucket_name';
```

start s3 metadata server

```
SCALITY_ACCESS_KEY_ID=yours  SCALITY_SECRET_ACCESS_KEY=yours npm run start_mdserver
```

Start S3 front server in S3 repo

```
SCALITY_ACCESS_KEY_ID=yours  SCALITY_SECRET_ACCESS_KEY=yours npm run start_s3server
```

start s3 data server

```
SCALITY_ACCESS_KEY_ID=yours  SCALITY_SECRET_ACCESS_KEY=yours npm run start_dataserver
```



check what's currently in your bucket
```
aws s3 --endpoint-url=http://127.0.0.1:8000 ls s3://
```

Create a bucket name 'test'
```
aws s3 --endpoint-url=http://127.0.0.1:8000 mb s3://test
```

Upload file in 'test'
```
aws s3 --endpoint-url=http://127.0.0.1:8000 cp Dockerfile s3://test
```

## Improvment in the future

Currently metadata is stroed in levedb locally, and data is stored in Google cloud, need to store metadata in Google also.

Build dockfile so the process can by more sample to run.

