import { createAxios, handleRequestError } from './adapter';

export type TournamentWinnerFields = {
  year: number;
  name: string;
  description: string | null;
  // Only sent when a new picture was picked; leaving it out keeps the one already stored.
  logo: string | null;
  easter_egg: boolean;
  easter_egg_image: string | null;
};

function body(fields: TournamentWinnerFields) {
  return {
    year: fields.year,
    name: fields.name,
    description:
      fields.description != null && fields.description.length > 0 ? fields.description : null,
    logo: fields.logo,
    easter_egg: fields.easter_egg,
    easter_egg_image: fields.easter_egg_image,
  };
}

export async function createTournamentWinner(
  tournament_id: number,
  fields: TournamentWinnerFields,
) {
  return createAxios()
    .post(`tournaments/${tournament_id}/winners`, body(fields))
    .catch((response: any) => handleRequestError(response));
}

export async function updateTournamentWinner(
  tournament_id: number,
  winner_id: number,
  fields: TournamentWinnerFields,
) {
  return createAxios()
    .put(`tournaments/${tournament_id}/winners/${winner_id}`, body(fields))
    .catch((response: any) => handleRequestError(response));
}

export async function deleteTournamentWinner(tournament_id: number, winner_id: number) {
  return createAxios()
    .delete(`tournaments/${tournament_id}/winners/${winner_id}`)
    .catch((response: any) => handleRequestError(response));
}
