const Storage = require('@google-cloud/storage');

const projectId = 'my-first-project-175717';

const storage = Storage({projectId: projectId});

// const bucketName = '42zenkmeyo';

function google_make_bucket (bucket)
{
    console.log('entering google make\n', bucket);
    storage.createBucket(bucket.toString())
    .then(() => {
        console.log(`Bucket ${bucket} created.`);
    })
    .catch((err) => {
        console.error('ERROR:', err);
    });
    console.log('exiting google make bucket\n', bucket);
    //return true;
}

// google_make_bucket("test_bucketblalabla");

module.exports = google_make_bucket;