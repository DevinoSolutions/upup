import load from 'load-script';
import { useEffect, useState } from 'react';

const useLoadOdAPI = () => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    load('https://js.live.net/v7.2/OneDrive.js', (err, _script) => {
      if (err) {
        console.log('Error loading OneDrive', err);
      } else {
        setIsLoaded(true);
      }
    });
  }, []);

  return { isLoaded };
};

export default useLoadOdAPI;
