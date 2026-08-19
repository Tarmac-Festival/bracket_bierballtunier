import { isoDate } from '@services/tournament';

import { createAxios, handleRequestError } from './adapter';

export type TournamentEventFields = {
  name: string;
  description: string | null;
  location: string | null;
  start_time: any;
  after_round_id: number | null;
  after_match_id: number | null;
  before_round_id: number | null;
  duration_minutes: number;
  blocks_matches: boolean;
};

// Mantine gives back '' for a text field that was emptied, the API wants nothing at all.
function orNull(value: string | null | undefined) {
  return value != null && value.length > 0 ? value : null;
}

function body(fields: TournamentEventFields) {
  return {
    name: fields.name,
    description: orNull(fields.description),
    location: orNull(fields.location),
    start_time: isoDate(fields.start_time),
    after_round_id: fields.after_round_id,
    after_match_id: fields.after_match_id,
    before_round_id: fields.before_round_id,
    duration_minutes: fields.duration_minutes,
    blocks_matches: fields.blocks_matches,
  };
}

export async function createTournamentEvent(tournament_id: number, fields: TournamentEventFields) {
  return createAxios()
    .post(`tournaments/${tournament_id}/events`, body(fields))
    .catch((response: any) => handleRequestError(response));
}

export async function updateTournamentEvent(
  tournament_id: number,
  event_id: number,
  fields: TournamentEventFields,
) {
  return createAxios()
    .put(`tournaments/${tournament_id}/events/${event_id}`, body(fields))
    .catch((response: any) => handleRequestError(response));
}

export async function deleteTournamentEvent(tournament_id: number, event_id: number) {
  return createAxios()
    .delete(`tournaments/${tournament_id}/events/${event_id}`)
    .catch((response: any) => handleRequestError(response));
}
