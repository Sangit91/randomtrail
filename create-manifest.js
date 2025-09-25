// create-manifest.js

const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'assets', 'images');
const outputPath = path.join(__dirname, 'js', 'image-manifest.js');

try {
    console.log('🔍 Starting to dynamically scan trait folders...');
    
    // Đọc tất cả các mục trong thư mục assets/images
    const allDirs = fs.readdirSync(imagesDir);

    // Lọc ra chỉ những mục là thư mục (loại bỏ các file như .DS_Store)
    const traitTypes = allDirs.filter(dirName => 
        fs.statSync(path.join(imagesDir, dirName)).isDirectory()
    );

    // Sắp xếp các loại trait theo thứ tự bảng chữ cái để đảm bảo thứ tự vẽ nhất quán
    traitTypes.sort();

    if (traitTypes.length === 0) {
        throw new Error('No trait folders found inside "assets/images/".');
    }

    console.log(`   - Detected ${traitTypes.length} trait types: [${traitTypes.join(', ')}]`);
    console.log(`   - Drawing order will be: [${traitTypes.join(' -> ')}]`);

    let manifest = {};

    traitTypes.forEach(type => {
        const dirPath = path.join(imagesDir, type);
        const files = fs.readdirSync(dirPath);
        
        const imageNames = files
            .filter(file => file.toLowerCase().endsWith('.png'))
            .map(file => file.slice(0, -4)); // Bỏ đuôi .png
        
        manifest[type.toUpperCase()] = imageNames;
    });

    // Tạo nội dung file JS, bao gồm cả thứ tự các trait
    const fileContent = `// Tệp này được tạo tự động bởi create-manifest.js vào lúc ${new Date().toLocaleString()}\n// KHÔNG SỬA ĐỔI TRỰC TIẾP!\n\nconst TRAIT_ORDER = ${JSON.stringify(traitTypes)};\n\nconst IMAGE_MANIFEST = ${JSON.stringify(manifest, null, 2)};`;

    fs.writeFileSync(outputPath, fileContent);

    console.log('\n✅ Dynamic image manifest created successfully at js/image-manifest.js');
    console.log('   You can now start your Live Server.');

} catch (error) {
    console.error('\n❌ Error creating image manifest:', error.message);
}