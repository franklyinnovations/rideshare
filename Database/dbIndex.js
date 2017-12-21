const cassandra = require('cassandra-driver');
const axios = require('axios');

const client = new cassandra.Client({ contactPoints: ['127.0.0.1'], keyspace: 'rideshare' });

client.connect();

function saveUnmatchedRideInfo(riderInfo) {
  const { ride_id } = riderInfo;
  const { rider_id } = riderInfo;
  const { start_loc } = riderInfo;
  const { end_loc } = riderInfo;
  const { timestamp } = riderInfo;
  const query =
    'INSERT INTO rideshare.newrides (ride_id, timestamp, rider_id, rider_start, rider_end) VALUES (?, ?, ?, ?, ?)';
  const params = [ride_id, timestamp, rider_id, start_loc, end_loc];

  client.execute(query, params, { prepare: true }, (err) => {
    if (err) {
      console.log(err);
    }
  });
}

async function updateUnmatchedRideInfo(rideId, updatedRideInfo) {
  // grabs unmatched ride_id from cache
  const newQuery = 'SELECT * FROM rideshare.newrides WHERE ride_id=?';
  const results = await client.execute(newQuery, [rideId], { prepare: true });
  const ride = results.rows[0];
  // inserts new matched ride into rideshare.matchedrides
  const matchedQuery =
    'INSERT INTO rideshare.matchedrides (ride_id, timestamp, rider_id, rider_start, rider_end, wait_est, driver_id, cancelled, cancellation_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const params = [
    rideId,
    ride.timestamp,
    ride.rider_id,
    ride.rider_start,
    ride.rider_end,
    updatedRideInfo.wait_est,
    updatedRideInfo.driver_id,
    0,
    0,
  ];
  client.execute(matchedQuery, params, { prepare: true }, (err) => {});
}

async function getRideInfo(rideId, cancellationTime, cancelledStatus) {
  // grabs ride from rideshare.matchedrides cache after user cancels
  const query = 'SELECT * FROM rideshare.matchedrides WHERE ride_id=?';
  const results = await client.execute(query, [rideId], { prepare: true });

  const ride = results.rows[0];
  return ride;
  // return client
  //   .execute(query, [rideId], { prepare: true })
  //   .then((results) => {
  //     const ride = results.rows[0];

  //     // attach cancellation Time and cancelled status onto data
  //     ride.cancellation_time = cancellationTime;
  //     ride.cancelled = cancelledStatus;
  //     // only in deployed version
  //     axios.post('http://localhost:8080/message_bus', ride);
  //   })
  //   .catch(err => console.log(err));
}

module.exports.saveUnmatchedRideInfo = saveUnmatchedRideInfo;
module.exports.updateUnmatchedRideInfo = updateUnmatchedRideInfo;
module.exports.getRideInfo = getRideInfo;
