#!/bin/bash

rm -rf /opt/kubo/* /opt/ipfs-cluster/*
mkdir -p /opt/kubo/plugins
cp /root/go-ds-s3-plugin/go-ds-s3-plugin /opt/kubo/plugins/
ipfs init /root/config
ipfs key rotate -o old
chown -R ipfs:ipfs /opt/kubo
chown root:root /opt/kubo/config /opt/kubo/datastore_spec
chmod a+r /opt/kubo/config /opt/kubo/datastore_spec

ipfs-cluster-service -c /opt/ipfs-cluster init
cp /root/service.json /opt/ipfs-cluster
chown -R ipfs:ipfs /opt/ipfs-cluster
chown root:root /opt/ipfs-cluster/service.json /opt/ipfs-cluster/identity.json
chmod a+r /opt/ipfs-cluster/service.json /opt/ipfs-cluster/identity.json

systemctl enable ipfs ipfs-cluster-service
systemctl start ipfs ipfs-cluster-service
