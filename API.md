# MedSense HMI API

This document describes the API exposed by the current Express backend in `server.js`.

## Overview

- Base URL:
  - local Node start: `http://localhost:3000`
  - Docker Compose on the host: `http://localhost:3001`
- Storage:
  - `data/patients.json`
  - `data/last-state.json`
- Authentication: none
- Transport: plain HTTP + JSON
- Realtime model: polling, not websockets
- Offline timeout: a node is considered offline when `Date.now() - lastSeenEpochMs > 5000`

## Patient model

Patient records are normalized by the backend before being returned.

```json
{
  "id": "patient-1712345678901",
  "nodeId": 1,
  "patientName": "Jan Smit",
  "age": 40,
  "targetBpm": 16,
  "referenceMinBpm": 12,
  "referenceMaxBpm": 20,
  "normalTempMinC": 36.5,
  "normalTempMaxC": 37.5,
  "groupLabel": "Adult",
  "updatedAt": "2026-03-31T10:00:00.000Z",
  "profileChecksum": "md5-hash"
}
```

Notes:

- `nodeId` is assigned automatically on create.
- `targetBpm` defaults to the midpoint of the breathing range when not supplied.
- `referenceMinBpm` and `referenceMaxBpm` default from the age band when missing or invalid.
- `normalTempMinC` and `normalTempMaxC` default to `36.5` and `37.5` when missing or invalid.
- `profileChecksum` is derived from:
  - `nodeId`
  - `patientName`
  - `age`
  - `targetBpm`
  - `referenceMinBpm`
  - `referenceMaxBpm`
  - `normalTempMinC`
  - `normalTempMaxC`

## Validation rules

Used by `POST /api/patients` and `PUT /api/patients/:id`.

- `patientName` is required and must not be blank after trimming
- `age` must be between `0` and `120`
- `targetBpm`, if provided, must be between `1` and `120`
- `referenceMinBpm`, if provided, must be between `1` and `120`
- `referenceMaxBpm`, if provided, must be between `1` and `120`
- `referenceMinBpm <= referenceMaxBpm` when both are provided
- `normalTempMinC`, if provided, must be between `30` and `45`
- `normalTempMaxC`, if provided, must be between `30` and `45`
- `normalTempMinC <= normalTempMaxC` when both are provided

Validation failures return `400` with:

```json
{
  "error": "validation message"
}
```

## Node state model

Returned by `GET /api/state` and `POST /api/select-patient`.

```json
{
  "updatedAt": "2026-03-31T10:00:00.000Z",
  "selectedPatientId": "patient-1712345678901",
  "nodeStates": {
    "1": {
      "nodeId": 1,
      "online": true,
      "latencyMs": 42,
      "breathsPerMinute": 16,
      "breathingLevel": 320,
      "temperatureC": 36.8,
      "temperatureState": "normal",
      "lastSeenEpochMs": 1774953000000,
      "source": "gateway"
    }
  }
}
```

`temperatureState` is computed from the linked patient temperature range:

- `normal`
- `warning`
- `alarm`

The backend applies an extra alarm margin of `0.5 °C` outside the patient range.

## Endpoints

### `GET /health`

Returns a basic health response.

Example response:

```json
{
  "ok": true,
  "time": "2026-03-31T10:00:00.000Z"
}
```

### `GET /api/config`

Returns frontend configuration and age-band defaults.

Example response:

```json
{
  "ageGroups": [
    { "key": "adult", "minAge": 18, "maxAge": 120, "minBpm": 12, "maxBpm": 20, "label": "Adult" }
  ],
  "defaultTemperatureRange": {
    "minC": 36.5,
    "maxC": 37.5
  },
  "temperatureWarningOffsetC": 0.5,
  "authEnabled": false,
  "theme": "dark",
  "languages": ["en", "nl", "ja"]
}
```

### `GET /patients.json`

Returns the normalized patient array directly.

Example response:

```json
[
  {
    "id": "patient-1712345678901",
    "nodeId": 1,
    "patientName": "Jan Smit",
    "age": 40,
    "targetBpm": 16,
    "referenceMinBpm": 12,
    "referenceMaxBpm": 20,
    "normalTempMinC": 36.5,
    "normalTempMaxC": 37.5,
    "groupLabel": "Adult",
    "updatedAt": "2026-03-31T10:00:00.000Z",
    "profileChecksum": "md5-hash"
  }
]
```

### `GET /api/patients`

Returns patients plus the currently selected patient ID.

Example response:

```json
{
  "patients": [],
  "selectedPatientId": null
}
```

### `GET /api/gateway/patients?checksum=...`

Gateway synchronization endpoint.

Behavior:

- the backend computes a list checksum over the current gateway-facing patient list
- `changed` is `true` when the provided query-string checksum does not match the computed checksum
- when `changed` is `false`, `patients` is returned as an empty array
- when `changed` is `true`, `patients` contains the normalized gateway patient payloads

Example response:

```json
{
  "checksum": "gateway-list-md5",
  "changed": true,
  "patients": [
    {
      "id": "patient-1712345678901",
      "nodeId": 1,
      "patientName": "Jan Smit",
      "age": 40,
      "targetBpm": 16,
      "referenceMinBpm": 12,
      "referenceMaxBpm": 20,
      "normalTempMinC": 36.5,
      "normalTempMaxC": 37.5,
      "groupLabel": "Adult",
      "profileChecksum": "patient-profile-md5"
    }
  ]
}
```

### `POST /api/patients`

Creates a patient and assigns the next free positive `nodeId`.

Request body:

```json
{
  "patientName": "Jan Smit",
  "age": 40,
  "referenceMinBpm": 12,
  "referenceMaxBpm": 20,
  "normalTempMinC": 36.5,
  "normalTempMaxC": 37.5
}
```

Notes:

- `targetBpm` is optional
- if no patient is currently selected, the new patient becomes the selected patient

Success response: `201 Created` with the full normalized patient object.

### `PUT /api/patients/:id`

Updates an existing patient.

Request body uses the same validation rules as create.

Behavior:

- returns `404` if the patient ID does not exist
- preserves the existing `nodeId`
- recalculates normalized defaults, `groupLabel`, and `profileChecksum`

Success response: full normalized patient object.

### `DELETE /api/patients/:id`

Deletes a patient.

Behavior:

- returns `404` if the patient ID does not exist
- if the deleted patient was selected, selection moves to the first remaining patient or `null`

Example response:

```json
{
  "ok": true,
  "removedPatientId": "patient-1712345678901",
  "selectedPatientId": null
}
```

### `GET /api/state`

Returns the current app state with computed node status.

Behavior:

- `online` is recomputed on every request using the 5 second timeout
- `temperatureState` is recomputed on every request using the patient linked to `nodeId`

### `POST /api/select-patient`

Sets the selected patient.

Request body:

```json
{
  "patientId": "patient-1712345678901"
}
```

Behavior:

- returns `404` if the patient does not exist
- returns the full current state after the selection update

### `POST /api/medsense`

Telemetry ingest endpoint for the gateway.

Minimum required request body:

```json
{
  "nodeId": 1
}
```

Full example:

```json
{
  "nodeId": 1,
  "breathsPerMinute": 16,
  "breathingLevel": 320,
  "temperatureC": 36.8,
  "latencyMs": 42,
  "patientChecksum": "previous-checksum-from-gateway"
}
```

Behavior:

- `nodeId` is required and must be `>= 1`
- missing numeric telemetry fields fall back to:
  - `breathsPerMinute = 0`
  - `breathingLevel = 0`
  - `temperatureC = null`
  - `latencyMs = 0`
- the request updates `state.nodeStates[nodeId]`
- `lastSeenEpochMs` is set from the current request time
- `source` is set to `"gateway"`
- if no patient is currently selected and this `nodeId` is linked to a patient, that patient becomes selected

Checksum behavior:

- `patientChanged` is request-driven
- if a patient exists for the node:
  - `patientChanged = patient.profileChecksum !== patientChecksum`
- if no patient exists for the node:
  - `patientChanged = Boolean(patientChecksum)`
- when `patientChanged` is `true`, `patient` contains the current gateway patient payload
- when `patientChanged` is `false`, `patient` is `null`

Example response:

```json
{
  "ok": true,
  "receivedAt": "2026-03-31T10:00:00.000Z",
  "patientChecksum": "current-patient-checksum-or-null",
  "patientChanged": false,
  "patient": null
}
```
