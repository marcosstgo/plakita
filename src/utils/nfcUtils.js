/**
 * Utilidades para manejo de NFC (Near Field Communication)
 * Compatible con Web NFC API
 *
 * Navegadores soportados:
 * - Chrome/Edge 89+ (Android)
 * - Safari no soporta (aún)
 *
 * Más info: https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API
 */

/**
 * Verifica si el navegador soporta NFC
 * @returns {boolean} true si soporta NFC
 */
export const isNFCSupported = () => {
  return 'NDEFReader' in window;
};

/**
 * Verifica si tenemos permisos para usar NFC
 * @returns {Promise<boolean>} true si tenemos permisos
 */
export const hasNFCPermission = async () => {
  if (!isNFCSupported()) return false;

  try {
    const permissionStatus = await navigator.permissions.query({ name: 'nfc' });
    return permissionStatus.state === 'granted';
  } catch (error) {
    // Algunos navegadores no soportan permissions.query para NFC
    // En ese caso, asumimos que pedir permisos al escanear funcionará
    return true;
  }
};

/**
 * Información sobre la compatibilidad NFC del dispositivo
 * @returns {object} Información de compatibilidad
 */
export const getNFCInfo = () => {
  const supported = isNFCSupported();
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroid = userAgent.includes('android');
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');

  return {
    supported,
    canRead: supported && isAndroid,
    canWrite: supported && isAndroid,
    platform: isAndroid ? 'android' : isIOS ? 'ios' : 'desktop',
    recommendedAction: !supported
      ? 'NFC no disponible en este dispositivo'
      : !isAndroid
      ? 'NFC solo funciona en Android Chrome'
      : 'NFC disponible'
  };
};

/**
 * Escanear un tag NFC y obtener su contenido
 * @param {function} onRead - Callback cuando se lee un tag
 * @param {function} onError - Callback en caso de error
 * @returns {Promise<NDEFReader>} Instancia del reader para poder detenerlo
 */
export const startNFCScan = async (onRead, onError) => {
  if (!isNFCSupported()) {
    throw new Error('NFC no está disponible en este navegador');
  }

  try {
    const ndef = new NDEFReader();

    // Iniciar el escaneo
    await ndef.scan();

    console.log('✅ Escaneo NFC iniciado. Acerca un tag NFC...');

    // Listener para cuando se detecta un tag
    ndef.addEventListener('reading', ({ message, serialNumber }) => {
      console.log('📱 Tag NFC detectado:', serialNumber);

      // Extraer los datos del tag
      const record = message.records[0];
      let data = null;

      if (record.recordType === 'url') {
        // Es una URL
        const textDecoder = new TextDecoder(record.encoding || 'utf-8');
        data = {
          type: 'url',
          url: textDecoder.decode(record.data),
          serialNumber
        };
      } else if (record.recordType === 'text') {
        // Es texto
        const textDecoder = new TextDecoder(record.encoding || 'utf-8');
        data = {
          type: 'text',
          text: textDecoder.decode(record.data),
          serialNumber
        };
      } else {
        // Otro tipo de record
        data = {
          type: record.recordType,
          rawData: record.data,
          serialNumber
        };
      }

      onRead(data);
    });

    // Listener para errores
    ndef.addEventListener('readingerror', () => {
      const error = new Error('Error leyendo el tag NFC');
      console.error('❌ Error leyendo NFC:', error);
      if (onError) onError(error);
    });

    return ndef;

  } catch (error) {
    console.error('❌ Error iniciando escaneo NFC:', error);
    if (onError) onError(error);
    throw error;
  }
};

/**
 * Escribir datos en un tag NFC
 * @param {string} url - URL a escribir en el tag
 * @param {object} options - Opciones adicionales
 * @returns {Promise<void>}
 */
export const writeNFCTag = async (url, options = {}) => {
  if (!isNFCSupported()) {
    throw new Error('NFC no está disponible en este navegador');
  }

  const {
    overwrite = true, // Sobrescribir datos existentes
    onProgress = null // Callback de progreso
  } = options;

  try {
    if (onProgress) onProgress('Preparando para escribir...');

    const ndef = new NDEFReader();

    if (onProgress) onProgress('Acerca el tag NFC al dispositivo...');

    // Escribir en el tag
    await ndef.write({
      records: [
        {
          recordType: 'url',
          data: url
        }
      ]
    }, {
      overwrite
    });

    console.log('✅ Tag NFC escrito exitosamente:', url);
    if (onProgress) onProgress('¡Tag NFC escrito exitosamente!');

  } catch (error) {
    console.error('❌ Error escribiendo tag NFC:', error);

    // Mensajes de error más amigables
    if (error.name === 'NotAllowedError') {
      throw new Error('Permiso denegado. Por favor permite el acceso a NFC.');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Tu dispositivo no soporta escritura NFC.');
    } else if (error.name === 'NotReadableError') {
      throw new Error('No se pudo leer el tag. Intenta de nuevo.');
    } else if (error.name === 'NetworkError') {
      throw new Error('Tag NFC está fuera de alcance o no es compatible.');
    } else {
      throw new Error(`Error escribiendo NFC: ${error.message}`);
    }
  }
};

/**
 * Hacer el tag de solo lectura (irreversible)
 * @param {string} url - URL a escribir
 * @returns {Promise<void>}
 */
export const makeNFCTagReadOnly = async (url) => {
  if (!isNFCSupported()) {
    throw new Error('NFC no está disponible en este navegador');
  }

  try {
    const ndef = new NDEFReader();

    await ndef.makeReadOnly({
      records: [
        {
          recordType: 'url',
          data: url
        }
      ]
    });

    console.log('✅ Tag NFC configurado como solo lectura');

  } catch (error) {
    console.error('❌ Error configurando tag como solo lectura:', error);
    throw new Error(`Error: ${error.message}`);
  }
};

/**
 * Extraer código de Plakita de una URL
 * @param {string} url - URL del tag NFC
 * @returns {string|null} Código del tag o null
 */
export const extractTagCodeFromURL = (url) => {
  try {
    // Ejemplo: https://plakita.app/activate-tag/PLK-ABC123
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');

    // Buscar después de /activate-tag/
    const activateIndex = pathParts.indexOf('activate-tag');
    if (activateIndex !== -1 && pathParts[activateIndex + 1]) {
      return pathParts[activateIndex + 1];
    }

    return null;
  } catch (error) {
    console.error('Error extrayendo código del tag:', error);
    return null;
  }
};

/**
 * Generar URL de activación para un tag
 * @param {string} tagCode - Código del tag
 * @returns {string} URL completa
 */
export const generateActivationURL = (tagCode) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/activate-tag/${tagCode}`;
};

/**
 * Generar URL de perfil público para una mascota
 * @param {string} petId - ID de la mascota
 * @returns {string} URL completa
 */
export const generatePublicProfileURL = (petId) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/public/pet/${petId}`;
};

/**
 * Hook helper para React - Detectar tags NFC automáticamente
 * @returns {object} Estado y funciones de NFC
 */
export const useNFC = () => {
  const [isScanning, setIsScanning] = React.useState(false);
  const [lastRead, setLastRead] = React.useState(null);
  const [error, setError] = React.useState(null);
  const readerRef = React.useRef(null);

  const startScanning = React.useCallback(async (onRead) => {
    try {
      setIsScanning(true);
      setError(null);

      const reader = await startNFCScan(
        (data) => {
          setLastRead(data);
          if (onRead) onRead(data);
        },
        (err) => {
          setError(err);
        }
      );

      readerRef.current = reader;
    } catch (err) {
      setError(err);
      setIsScanning(false);
    }
  }, []);

  const stopScanning = React.useCallback(() => {
    if (readerRef.current) {
      // El NDEFReader no tiene método stop, pero podemos limpiar el ref
      readerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const writeTag = React.useCallback(async (url, options) => {
    try {
      setError(null);
      await writeNFCTag(url, options);
      return { success: true };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    }
  }, []);

  React.useEffect(() => {
    // Cleanup al desmontar
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    isSupported: isNFCSupported(),
    isScanning,
    lastRead,
    error,
    startScanning,
    stopScanning,
    writeTag,
    info: getNFCInfo()
  };
};

// Exportar todo como default también
export default {
  isNFCSupported,
  hasNFCPermission,
  getNFCInfo,
  startNFCScan,
  writeNFCTag,
  makeNFCTagReadOnly,
  extractTagCodeFromURL,
  generateActivationURL,
  generatePublicProfileURL,
  useNFC
};
