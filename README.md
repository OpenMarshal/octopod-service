# octopod

Octopod is a npm package to ease the making of octopod services and octopod service calls in the octopod network.

The octopod network is a network working around one or many octopod cores. An octopod core is a webdav server which allow the management of octopod services and allow them to work together. An octopod service is a node in the octopod network linked directly to the octopod core. A client or another octopod service can command or call a method of a octopod service through the octopod core.

Here is a generic example of an octopod :

![Services - Core - Clients](/img/ServicesCoreClients.png)

This module allow to :
* Create a service
* Call a service's method
