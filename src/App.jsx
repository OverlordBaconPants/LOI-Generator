import React, { useState } from 'react';
import Papa from 'papaparse';
import { Table } from './components/ui/table';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { FileText, Download } from 'lucide-react';

// LOI Strategy Templates
const LOI_TEMPLATES = {
  'Seller Financing': (property) => `
Dear ${property.MLS_Curr_ListAgentName},

I'm writing regarding your listing at ${property.PropertyAddress}. Based on our analysis, this property has substantial equity with an LTV of ${property.LTV}, making it an excellent candidate for seller financing. This approach could provide your client with steady monthly income while potentially achieving a higher sale price than a traditional cash offer.

The property's current assessed value of ${property.AssessedTotal} and its characteristics (${property.Beds} beds/${property.Baths} baths) make it an attractive investment opportunity. With seller financing, we can offer terms that would generate reliable monthly income for your client while ensuring you receive your full commission at closing.

Would you be open to discussing how a seller-financed arrangement could benefit both your client and you? I'm available at your convenience to explore this opportunity further.`,

  'Subject-to': (property) => `
Dear ${property.MLS_Curr_ListAgentName},

I'm reaching out about ${property.PropertyAddress}. We've identified this property as a potential candidate for a subject-to purchase, which could provide an expedited closing while addressing the existing financing of ${property.TotalLoans}.

This approach would allow us to take over the current mortgage payments while ensuring a clean transition for your client. Your commission would be secured at closing, and your client could move forward without the typical delays associated with traditional financing.

Would you be interested in discussing how this structure could benefit your client? I'm happy to explain the process in detail and explore how we can make this work for all parties involved.`,

  'Hybrid': (property) => `
Dear ${property.MLS_Curr_ListAgentName},

I'm writing regarding your listing at ${property.PropertyAddress}. We've analyzed this property's unique position with an LTV of ${property.LTV} and believe a hybrid purchase structure could maximize value for your client while ensuring a smooth transaction.

Our proposed approach would combine taking over the existing financing of ${property.TotalLoans} with additional seller financing for the remaining equity portion. This structure could provide your client with both immediate relief from their current mortgage obligations and an ongoing income stream, all while ensuring your full commission at closing.

Would you be open to discussing how this creative solution could benefit both your client and you? I'm available to explain the details and explore how we can make this work for everyone involved.`
};

// Helper function to determine LOI strategy based on LTV
const determineLOIStrategy = (ltv) => {
  if (!ltv) return 'Unknown';
  // Handle if LTV is already a number
  if (typeof ltv === 'number') {
    if (ltv <= 25) return 'Seller Financing';
    if (ltv <= 75) return 'Hybrid';
    return 'Subject-to';
  }
  // Handle string values
  const ltvString = String(ltv).trim();
  if (!ltvString) return 'Unknown';
  
  // Remove any % symbol and convert to number
  const ltvNumber = parseFloat(ltvString.replace('%', ''));
  if (isNaN(ltvNumber)) return 'Unknown';
  
  if (ltvNumber <= 25) return 'Seller Financing';
  if (ltvNumber <= 75) return 'Hybrid';
  return 'Subject-to';
};

// Main component
export default function LOIGenerator() {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    Papa.parse(file, {
      header: true,
      dynamicTyping: true, // Convert numeric values automatically
      skipEmptyLines: true,
      complete: (results) => {
        const processedData = results.data
          .filter(row => row && typeof row === 'object') // Filter out null/undefined rows
          .map(row => ({
            ...row,
            loiStrategy: determineLOIStrategy(row.LTV),
            bedsBaths: `${row.Beds || 'N/A'}/${row.Baths || 'N/A'}`,
            PropertyAddress: row.PropertyAddress || 'No Address',
            AssessedTotal: row.AssessedTotal || 'N/A',
            TotalLoans: row.TotalLoans || 'N/A',
            LTV: row.LTV || 'N/A',
            MLS_Curr_ListAgentName: row.MLS_Curr_ListAgentName || 'No Agent Listed',
            MLS_Curr_ListAgentEmail: row.MLS_Curr_ListAgentEmail || 'No Email Listed'
          }));
        setData(processedData);
        
        // Log the first row to help with debugging
        if (processedData.length > 0) {
          console.log('First row of processed data:', processedData[0]);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        // You might want to show this error to the user in the UI
      }
    });
  };

  // Generate LOI content
  const generateLOI = (property) => {
    return LOI_TEMPLATES[property.loiStrategy](property);
  };

  // Download LOI as text file
  const downloadLOI = (property) => {
    const content = generateLOI(property);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LOI_${property.PropertyAddress.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const pageCount = Math.ceil(data.length / itemsPerPage);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">LOI Generator</h1>
        
        <div className="mb-6">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
          />
        </div>

        {data.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th className="p-2">Property Address</th>
                  <th className="p-2">Beds/Baths</th>
                  <th className="p-2">Assessed Value</th>
                  <th className="p-2">Total Loans</th>
                  <th className="p-2">LTV</th>
                  <th className="p-2">LOI Strategy</th>
                  <th className="p-2">Agent</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((property, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">{property.PropertyAddress}</td>
                    <td className="p-2">{property.bedsBaths}</td>
                    <td className="p-2">{property.AssessedTotal}</td>
                    <td className="p-2">{property.TotalLoans}</td>
                    <td className="p-2">{property.LTV}</td>
                    <td className="p-2">{property.loiStrategy}</td>
                    <td className="p-2">{property.MLS_Curr_ListAgentName}</td>
                    <td className="p-2">{property.MLS_Curr_ListAgentEmail}</td>
                    <td className="p-2">
                      <Button
                        onClick={() => downloadLOI(property)}
                        className="flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Download LOI</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="mt-4 flex justify-between items-center">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
                disabled={currentPage === pageCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}