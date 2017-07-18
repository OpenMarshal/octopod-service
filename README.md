# octopod

Octopod is a npm package to ease the making of octopod services and octopod service calls in the octopod network.

The octopod network is a network working around one or many octopod cores. An octopod core is a webdav server which allow the management of octopod services and allow them to work together. An octopod service is a node in the octopod network linked directly to the octopod core. A client or another octopod service can command or call a method of a octopod service through the octopod core.

Here is a generic example of an octopod :

![Services - Core - Clients](/img/ServicesCoreClients.png)

This module allow to :
* Create a service
* Call a service's method

## Install

```bash
npm install octopod
```

## Usage

### Create a service

```typescript
import { Service } from 'octopod'

class BlaBlaService extends Service
{
    constructor(coreUrl : string)
    {
        super('blabla', coreUrl);
    }

    start()
    {
        this.reference({
            inputs: {
                'methodName': {
                    isVolatile: true,
                    mainOutputMethod: 'outputMethodName', // The outputMethodName which will contain the returned data
                    outputs: {
                        'outputMethodName': 1 // Might pipe to another method
                    }
                }
            }
        }, (e) => {
            if(e)
                throw e;
            
            this.bindMethod('methodName', (data, info) => {
                this.putObject(info.mainOutput, {
                    value: data.value + ' blabla'
                }, (e) => {
                    this.log('Responded');
                    this.dispose(info);
                })
            })
        })
    }
}

const service = new BlaBlaService('http://...');

// Define a command "stop" for this service
service.commands['stop'] = (input, cb) => {
    cb();
    process.exit();
}

service.start();
```

### Call a service's method

```typescript
import { call } from 'octopod'

this.call('http://...', 'blabla', 'methodName', {
    value: 'so?'
}, (response, paths, cleanup) => {
    console.log(response.value); // Will display 'so? blabla'
    cleanup();
})
```
