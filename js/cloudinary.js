import { v2 as cloudinary } from 'cloudinary';

(async function () {
  cloudinary.config({
    cloud_name: 'dhar5ovav',
    api_key: '256988391459486',
    api_secret: 'vd9fvxPfKvgCBK1wo8VaM-OVlBs'
  });

  try {
    const uploadResult = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg',
      {
        public_id: 'shoes',
      }
    );

    console.log('Upload success:', uploadResult.secure_url);

    // Simula guardar en una base de datos
    const db = [];
    db.push({ image: uploadResult.secure_url });

    // Simula recuperación y consulta de longitud
    const result = db[0];
    console.log('Imagen:', result.image);
    console.log('Longitud de URL:', result.image.length);
  } catch (error) {
    console.error('Error subiendo imagen:', error);
  }
})();
