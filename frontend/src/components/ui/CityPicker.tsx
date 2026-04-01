import { useMemo, useState } from 'react';
import { getProvinces, getCitiesByProvince } from '../../data/cities';

/**
 * 城市两级联动选择器
 * 需求：1.1、1.2、1.3、1.4、1.5、1.6
 */
interface CityPickerProps {
  /** 确认选择时回调，传入城市名 */
  onConfirm: (city: string) => void;
  onClose: () => void;
  /** 已选城市列表，用于高亮已选状态 */
  selectedCities?: string[];
}

function CityPicker({ onConfirm, onClose, selectedCities = [] }: CityPickerProps) {
  const [provinceFilter, setProvinceFilter] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [error, setError] = useState('');

  const provinces = useMemo(() => getProvinces(), []);

  // 省份筛选：关键词为空时返回全部省份
  const filteredProvinces = useMemo(
    () =>
      provinceFilter
        ? provinces.filter((p) => p.includes(provinceFilter))
        : provinces,
    [provinces, provinceFilter]
  );

  const cities = useMemo(
    () => (selectedProvince ? getCitiesByProvince(selectedProvince) : []),
    [selectedProvince]
  );

  const handleProvinceSelect = (province: string) => {
    setSelectedProvince(province);
    setSelectedCity(''); // 切换省份时清空已选城市
    setError('');
  };

  const handleCitySelect = (cityName: string) => {
    setSelectedCity(cityName);
    setError('');
  };

  const handleConfirm = () => {
    if (!selectedCity) {
      setError('请先选择一个城市');
      return;
    }
    onConfirm(selectedCity);
    onClose();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 省份搜索输入框 */}
      <input
        type="text"
        placeholder="搜索省份"
        value={provinceFilter}
        onChange={(e) => setProvinceFilter(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* 省份 + 城市双列表 */}
      <div className="flex gap-2">
        {/* 左侧：省份列表 */}
        <div className="w-1/2 overflow-y-auto border border-gray-200 rounded-lg" style={{ height: '150px' }}>
          {filteredProvinces.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">无匹配省份</p>
          ) : (
            filteredProvinces.map((province) => (
              <button
                key={province}
                onClick={() => handleProvinceSelect(province)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  selectedProvince === province
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {province}
              </button>
            ))
          )}
        </div>

        {/* 右侧：城市列表 */}
        <div className="w-1/2 overflow-y-auto border border-gray-200 rounded-lg" style={{ height: '150px' }}>
          {!selectedProvince ? (
            <p className="text-center text-gray-400 text-sm py-4">请先选择省份</p>
          ) : cities.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">暂无城市</p>
          ) : (
            cities.map((city) => {
              const isAlreadySelected = selectedCities.includes(city.name);
              const isCurrentSelected = selectedCity === city.name;
              return (
                <button
                  key={city.name}
                  onClick={() => handleCitySelect(city.name)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    isCurrentSelected
                      ? 'bg-blue-500 text-white font-medium'
                      : isAlreadySelected
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {city.name}
                  {isAlreadySelected && !isCurrentSelected && (
                    <span className="ml-1 text-xs text-green-500">✓</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* 确认按钮 */}
      <button
        onClick={handleConfirm}
        className="w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors"
      >
        确认
      </button>
    </div>
  );
}

export default CityPicker;
