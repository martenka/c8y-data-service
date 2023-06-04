# C8y-Data-Service

## Description

This is the data service for data exporting and sharing solution based on [Cumulocity](https://cumulocity.com/guides/concepts/introduction/)
The solution consists of three services: c8y-data-service(this), [c8y-core-service](https://github.com/martenka/c8y-core-service) and [c8y-admin](https://github.com/martenka/c8y-admin)

## Installation

```bash
$ yarn install
```

## Running all services

Currently, all services run on the local machine.  
To run the whole solution, git clone  [c8y-data-service](https://github.com/martenka/c8y-data-service) and [c8y-admin](https://github.com/martenka/c8y-admin),  
fill out necessary ENV variables and run the commands specified in each service. Dependencies (mongo, min.io, rabbitmq) will be run through  
docker, services will run on the host machine.
For that Node.js V18 or greater should be used (lower may work but have not been tested with).  
You can use [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows) for easier Node.js version switching

The order of starting the services should be:
1. docker dependencies
2. c8y-data-service
3. c8y-core-service **Important:** For first run make sure data-service is running before starting core-service, otherwise the default user  
   is not synced to data-service.
4. c8y-admin

## Running this service

### ENV variables
Cumulocity account (that works with its API) is necessary for the solution to work.  
Please contact the author on getting the credentials if necessary for testing purposes

Before running the service, copy .env file from env folder to root path of this service and fill out the blank fields.  

CKAN__AUTH_TOKEN - This is to upload files to CKAN. This has to be created by the user by logging into CKAN, going to "View Profile"  -> "API Tokens", then generating a key
and putting the value into CKAN__AUTH_TOKEN variable.

CKAN__ORGANISATION_ID - Organisation under where to upload new files. First a new organisation has to be created from CKAN  
and then the ORGANISATION_ID has to be fetched via CKAN API.

Example request:
```bash
# CKAN One Organisation
$ curl --location 'https://localhost:8443/api/3/action/organization_show?id=test' \
--header 'Authorization: [YOUR_TOKEN]'
```

More complete CKAN API documentation is available [here](https://docs.ckan.org/en/2.9/api/#action-api-reference)

Other values don't have to be changed for **testing** purposes.

## Commands
This assumes that docker dependencies are already running (started from c8y-core-service)
```bash
# Start service in watch mode OR
$ yarn start:dev

# Production mode
$ yarn build && yarn start:prod
```

## Testing

```bash
# Tests
$ yarn test

# Tests with coverage
$ yarn test:cov
```

## License

[MIT license](LICENSE.md).
