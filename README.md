```
docker run -d -p 27017:27017 --name inventory-mongo-db-with-replica mongo mongod --replSet rs0 --bind_ip_all
```


```
docker container start inventory-mongo-db-with-replica
```


