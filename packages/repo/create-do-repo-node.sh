#!/bin/bash

set -e

id=$(tr -dc a-f0-9 </dev/urandom | head -c 6 ; echo '')

image=$1
region=$2

echo $id


function doCall() {
  curl -X POST -H 'Content-Type: application/json' \
      -H 'Authorization: Bearer '$DO_TOKEN'' \
      -d "$2" \
      "https://api.digitalocean.com/v2/$1"
}

doCall droplets '{"name":"cannon-repo-snap-'"${image}"'-'"${id}"'",
          "size":"s-2vcpu-4gb",
          "region":"'"${region}"'",
          "image":"'"${image}"'",
          "monitoring":true,
          "ssh_keys": ["24:68:3b:07:d1:91:31:c5:fd:50:a0:e2:6e:6b:68:93"],
          "project_id": "c150fe3a-e25f-41ed-8c15-c9880ba0db23",
          "user_data":"#!/bin/bash\n\nexport IPFS_PATH=/opt/kubo\nrm -rf /opt/kubo/* /opt/ipfs-cluster/*\nmkdir -p /opt/kubo/plugins\ncp /root/go-ds-s3-plugin/go-ds-s3-plugin /opt/kubo/plugins/\nipfs init /root/config\nipfs key rotate -o old\nchown -R ipfs:ipfs /opt/kubo\nchown root:root /opt/kubo/config /opt/kubo/datastore_spec\nchmod a+r /opt/kubo/config /opt/kubo/datastore_spec\n\nipfs-cluster-service -c /opt/ipfs-cluster init\ncp /root/service.json /opt/ipfs-cluster\nchown -R ipfs:ipfs /opt/ipfs-cluster\nchown root:root /opt/ipfs-cluster/service.json /opt/ipfs-cluster/identity.json\nchmod a+r /opt/ipfs-cluster/service.json /opt/ipfs-cluster/identity.json\nsed -i 's/repo-main/repo-${region}/g' /etc/grafana-agent.yaml\n\nsystemctl enable ipfs ipfs-cluster-service grafana-agent\nsystemctl start ipfs ipfs-cluster-service grafana-agent"}' 
