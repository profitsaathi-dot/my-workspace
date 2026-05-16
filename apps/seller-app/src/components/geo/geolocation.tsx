


const getLocation = (): Promise<{ lat: number | null; lng: number | null }> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lng: null });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        // user denied OR error
        resolve({ lat: null, lng: null });
      },
      {
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
};