import React from 'react';

export default function FontTest() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-black">Font Test Page</h1>
        
        {/* Large letters for clear comparison */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Large Letters (72px)</h2>
          <div className="text-7xl font-normal mb-4 text-black" style={{ fontFamily: 'Figtree, sans-serif' }}>
            f t g x
          </div>
          <div className="text-7xl font-medium mb-4 text-black" style={{ fontFamily: 'Figtree, sans-serif' }}>
            f t g x
          </div>
          <div className="text-7xl font-semibold mb-4 text-black" style={{ fontFamily: 'Figtree, sans-serif' }}>
            f t g x
          </div>
          <div className="text-7xl font-bold mb-4 text-black" style={{ fontFamily: 'Figtree, sans-serif' }}>
            f t g x
          </div>
        </div>

        {/* Common words containing these letters */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Common Words (24px)</h2>
          <div className="text-2xl font-normal mb-2 text-black" style={{ fontFamily: 'Figtree, sans-serif' }}>
            suggestions, fixing, text, exactly
          </div>
          <div className="text-2xl font-medium mb-2 text-black" style={{ fontFamily: 'Figtree, sans-serif' }}>
            suggestions, fixing, text, exactly
          </div>
          <div className="text-2xl font-semibold mb-2 text-black" style={{ fontFamily: 'Figtree, sans-serif' }}>
            suggestions, fixing, text, exactly
          </div>
          <div className="text-2xl font-bold mb-2 text-black" style={{ fontFamily: 'Figtree, sans-serif' }}>
            suggestions, fixing, text, exactly
          </div>
        </div>

        {/* System font comparison */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">System Font Comparison</h2>
          <div className="text-2xl font-normal mb-2 text-black" style={{ fontFamily: 'system-ui, sans-serif' }}>
            System Font: f t g x suggestions, fixing, text, exactly
          </div>
          <div className="text-2xl font-normal mb-2 text-black" style={{ fontFamily: 'Figtree, sans-serif' }}>
            Figtree Font: f t g x suggestions, fixing, text, exactly
          </div>
        </div>

        {/* Font loading status */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Font Loading Status</h2>
          <div id="font-status" className="text-lg p-4 bg-gray-100 rounded"></div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const statusDiv = document.getElementById('font-status');
            
            // Check if Figtree is loaded
            if (document.fonts) {
              document.fonts.ready.then(function() {
                const figtreeLoaded = document.fonts.check('16px Figtree');
                statusDiv.innerHTML = 'Figtree loaded: ' + figtreeLoaded + '<br>Available fonts: ' + Array.from(document.fonts).map(f => f.family).join(', ');
              });
            } else {
              statusDiv.innerHTML = 'Font loading API not supported';
            }
          });
        `
      }} />
    </div>
  );
}