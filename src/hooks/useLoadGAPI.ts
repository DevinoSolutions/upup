import load from 'load-script';
import { useEffect, useState } from 'react';

const SCOPES = 'https://www.googleapis.com/auth/drive';

interface props {
  GOOGLE_CLIENT_ID: string | undefined;
}

/**
 * This hook loads the Google API and the Google Identity Services API
 * @param GOOGLE_CLIENT_ID
 */
const useLoadGAPI = ({ GOOGLE_CLIENT_ID }: props) => {
  const [pickerApiLoaded, setPickerApiLoaded] = useState<boolean>(false);
  const [gisLoaded, setGisLoaded] = useState<boolean>(false);
  const [tokenClient, setTokenClient] = useState<any>(null);

  /**
   * This function is called when the Google Picker API is loaded
   */
  const onPickerApiLoad = () => {
    gapi.load('picker', () => {
      setPickerApiLoaded(true);
    });
  };

  /**
   * This function is called when the Google Identity Services API is loaded
   */
  const onGisLoaded = () => {
    setTokenClient(
      new (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
      })
    );
    setGisLoaded(true);
  };

  useEffect(() => {
    /**
     * Load the Google API
     */
    load('https://apis.google.com/js/api.js', (err, _script) => {
      if (err) {
        console.log('Error loading GAPI', err);
      } else {
        onPickerApiLoad();
      }
    });

    /**
     *  Load the Google Identity Services API
     */
    load('https://accounts.google.com/gsi/client', async (err, _script) => {
      if (err) {
        console.log('Error loading GAPI', err);
      } else {
        onGisLoaded();
      }
    });
  }, [pickerApiLoaded, gisLoaded]);

  /**
   * Return the tokenClient, pickerApiLoaded, and gisLoaded
   */
  return { tokenClient, pickerApiLoaded, gisLoaded };
};

export default useLoadGAPI;
