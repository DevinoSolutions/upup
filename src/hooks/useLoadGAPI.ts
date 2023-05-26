import load from 'load-script';
import { useEffect, useState } from 'react';

const SCOPES = 'https://www.googleapis.com/auth/drive';

interface props {
  CLIENT_ID: string;
}

const useLoadGAPI = ({ CLIENT_ID }: props) => {
  const [pickerApiLoaded, setPickerApiLoaded] = useState<boolean>(false);
  const [gisLoaded, setGisLoaded] = useState<boolean>(false);
  const [tokenClient, setTokenClient] = useState<any>(null);

  const onPickerApiLoad = () => {
    gapi.load('picker', () => {
      setPickerApiLoaded(true);
    });
  };
  const onGisLoaded = () => {
    setTokenClient(
      new window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
      })
    );
    setGisLoaded(true);
  };

  useEffect(() => {
    load('https://apis.google.com/js/api.js', (err, _script) => {
      if (err) {
        console.log('Error loading GAPI', err);
      } else {
        onPickerApiLoad();
      }
    });

    load('https://accounts.google.com/gsi/client', async (err, _script) => {
      if (err) {
        console.log('Error loading GAPI', err);
      } else {
        onGisLoaded();
      }
    });
  }, [pickerApiLoaded, gisLoaded]);

  return { tokenClient, pickerApiLoaded, gisLoaded };
};

export default useLoadGAPI;
