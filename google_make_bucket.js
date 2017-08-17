const Storage = require('@google-cloud/storage');

const projectId = 'my-first-project-175717';

const storage = Storage({projectId: projectId});

// const bucketName = '42zenkmeyo';

function google_make_bucket (bucket)
{
    storage.createBucket(bucket)
    .then(() => {
        console.log(`Bucket ${bucket} created.`);
    })
    .catch((err) => {
        console.error('ERROR:', err);
    });
}

google_make_bucket("test_bucketblalabla");

// module.exports = makeBucket;