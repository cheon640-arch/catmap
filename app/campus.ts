export const PNU_CENTER: [number, number] = [35.23435, 129.07927];

export const PNU_CAMPUS: [number, number][] = [
  [35.23753, 129.07900],
  [35.23691, 129.08294],
  [35.23542, 129.08293],
  [35.23358, 129.08391],
  [35.23257, 129.08446],
  [35.23005, 129.08374],
  [35.22995, 129.08120],
  [35.23067, 129.07952],
  [35.23202, 129.07622],
  [35.23162, 129.07502],
  [35.23448, 129.07385],
  [35.23598, 129.07492],
  [35.23653, 129.07586],
  [35.23774, 129.07688],
  [35.23854, 129.07713],
  [35.23783, 129.07825],
];

export function isInsidePnuCampus(lat: number, lng: number) {
  let inside = false;
  for (let index = 0, previous = PNU_CAMPUS.length - 1; index < PNU_CAMPUS.length; previous = index++) {
    const [currentLat, currentLng] = PNU_CAMPUS[index];
    const [previousLat, previousLng] = PNU_CAMPUS[previous];
    const crosses =
      currentLng > lng !== previousLng > lng &&
      lat < ((previousLat - currentLat) * (lng - currentLng)) / (previousLng - currentLng) + currentLat;
    if (crosses) inside = !inside;
  }
  return inside;
}
