export const PublicPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: {
        AWS: ['*'],
      },
      Action: ['s3:GetBucketLocation', 's3:ListBucket'],
      Resource: ['arn:aws:s3:::public'],
    },
    {
      Effect: 'Allow',
      Principal: {
        AWS: ['*'],
      },
      Action: ['s3:GetObject'],
      Resource: ['arn:aws:s3:::public/*'],
    },
  ],
};

export const BucketPolicies = {
  READ_PUBLIC: JSON.stringify(PublicPolicy),
};
