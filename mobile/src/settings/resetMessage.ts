export function resetMessage(unsentCount: number) {
  const kept = 'Reports already on the server stay there.';

  if (unsentCount === 1) {
    return `This removes 1 report that has not reached the server. ${kept}`;
  }

  if (unsentCount > 1) {
    return `This removes ${unsentCount} reports that have not reached the server. ${kept}`;
  }

  return `This clears the saved list on this phone. ${kept}`;
}
