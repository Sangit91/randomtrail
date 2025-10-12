/**
 * recipes.js
 * Định nghĩa các công thức để xác định độ hiếm (Rarity) dựa trên sự kết hợp các thuộc tính.
 */

// Định nghĩa các công thức cho Legendary (Huyền thoại)
const LEGENDARY_RECIPES = [
    // 1. Bộ "Cyberpunk": Character là cyborg + Background công nghệ
    {
        "01_character": ["cyborg", "cyborg2", "cyborg3", "cyborg4"],
        "02_background": ["bg1", "bg4", "bg5"], // Giả sử đây là các nền phong cách công nghệ/trừu tượng
        // Có thể yêu cầu thêm FX là cyborg để trọn bộ
        "03_fx": ["cyborg", "cyborg2"]
    },
    // 2. Bộ "Thiên nhiên Hoang dã": Thú + Cảnh thiên nhiên + Hào quang thiên nhiên
    {
        "01_character": ["cat", "cat2", "dog (1)", "fox", "fox2"],
        "02_background": ["bg10", "bg6"], // Giả sử đây là nền nhẹ nhàng, màu nước
        "04_aura": ["aura (1)", "aura (2)", "aura (3)", "aura (4)", "aura (5)"]
    },
    // 3. Bộ "Huyền thoại Bóng đá": Nhân vật cầu thủ + Nền năng động
    {
        "01_character": ["human2", "human5"], // Neymar, LeBron (ví dụ)
        "02_background": ["bg7", "bg9"], // Nền có vệt màu mạnh mẽ
        "03_fx": ["human2", "human5"] // FX trùng với nhân vật
    }
];

// Định nghĩa các công thức cho Epic (Sử thi)
const EPIC_RECIPES = [
    // 1. Chỉ cần Character là các nhân vật người nổi tiếng (human)
    {
        "01_character": ["human1", "human2", "human3", "human4", "human5"]
    },
    // 2. Chỉ cần Character là Cyborg bất kỳ
    {
        "01_character": ["cyborg", "cyborg2", "cyborg3", "cyborg4"]
    },
    // 3. Sự kết hợp đẹp mắt: Thú + Hào quang tròn
    {
        "01_character": ["cat", "cat2", "dog (1)", "fox", "fox2"],
        "04_aura": ["aura (6)"]
    }
];

// Định nghĩa các công thức cho Rare (Hiếm)
const RARE_RECIPES = [
    // 1. Bất kỳ sự kết hợp nào có Background khói/lửa (bg2, bg3)
    {
        "02_background": ["bg2", "bg3"]
    },
    // 2. Bất kỳ sự kết hợp nào có Aura khói/lửa (trùng tên với bg)
    {
        "04_aura": ["bg1", "bg2", "bg3"]
    }
];

/**
 * Hàm chính để xác định độ hiếm dựa trên bộ thuộc tính đã roll.
 * @param {object} traits - Đối tượng chứa các thuộc tính đã roll (vd: { "01_character": "fox", ... })
 * @returns {string} - Độ hiếm được xác định ("Legendary", "Epic", "Rare", hoặc null nếu không khớp công thức nào)
 */
function determineRarityFromRecipes(traits) {
    
    // Hàm bổ trợ để kiểm tra xem bộ traits có khớp với một công thức không
    function matchesRecipe(recipe) {
        for (const traitType in recipe) {
            // Giá trị trait thực tế người dùng roll được
            const rolledValue = traits[traitType];
            // Danh sách các giá trị được chấp nhận trong công thức cho loại trait này
            const acceptedValues = recipe[traitType];

            // Nếu người dùng không roll ra trait loại này, hoặc giá trị roll không nằm trong danh sách chấp nhận
            if (!rolledValue || !acceptedValues.includes(rolledValue)) {
                return false; // Không khớp công thức
            }
        }
        return true; // Tất cả các điều kiện trong công thức đều thỏa mãn
    }

    // Kiểm tra theo thứ tự ưu tiên: Legendary -> Epic -> Rare

    for (const recipe of LEGENDARY_RECIPES) {
        if (matchesRecipe(recipe)) return "Legendary";
    }

    for (const recipe of EPIC_RECIPES) {
        if (matchesRecipe(recipe)) return "Epic";
    }

    for (const recipe of RARE_RECIPES) {
        if (matchesRecipe(recipe)) return "Rare";
    }

    return null; // Không khớp công thức đặc biệt nào -> sẽ dùng random cho Common/Uncommon
}

