import { isoDate } from '@services/tournament';

import { createAxios, handleRequestError } from './adapter';

export type TournamentEventFields = {
  name: string;
  description: string | null;
  start_time: any;
  duration_minutes: number;
  blocks_matches: boolean;
};

function body(fields: TournamentEventFields) {
  return {
    name: fields.name,
    description:
      fields.description != null && fields.description.length > 0 ? fields.description : null,
    start_time: isoDate(fields.start_time),
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
