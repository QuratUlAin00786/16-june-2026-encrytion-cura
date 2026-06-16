import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Download, ExternalLink, Mail, Phone } from "lucide-react";

const curaLogoPath = "/cura-logo.png";

export default function Press() {
  const pressReleases = [
    {
      id: 1,
      title: "Cura Software Limited Launches Revolutionary AI-Powered EMR Platform",
      date: "15th January 2025",
      summary: "Cura EMR introduces cutting-edge artificial intelligence capabilities to streamline healthcare workflows and improve patient outcomes across the UK.",
      category: "Product Launch",
      featured: true
    },
    {
      id: 2,
      title: "Cura Software Limited Expands Healthcare Technology Portfolio with Cura EMR",
      date: "8th December 2024",
      summary: "Strategic investment in healthcare technology demonstrates Cura Software Limited's commitment to transforming medical practice management.",
      category: "Company News",
      featured: false
    },
    {
      id: 3,
      title: "Cura EMR Achieves UK GDPR Compliance Certification",
      date: "22nd November 2024",
      summary: "Comprehensive data protection framework ensures patient privacy and regulatory compliance for healthcare providers.",
      category: "Compliance",
      featured: false
    }
  ];

  const mediaAssets = [
    {
      name: "Cura Logo Package",
      description: "High-resolution logos in various formats (PNG, SVG, PDF)",
      size: "2.4 MB",
      type: "Logos"
    },
    {
      name: "Product Screenshots",
      description: "Dashboard and feature screenshots for editorial use",
      size: "15.7 MB",
      type: "Images"
    },
    {
      name: "Company Fact Sheet",
      description: "Key statistics and company information",
      size: "1.2 MB",
      type: "Documents"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="border-b bg-white/95 backdrop-blur-md dark:bg-gray-900/95 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-3">
              <img 
                src={curaLogoPath} 
                alt="Cura EMR" 
                className="h-16 w-auto"
              />
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-medium transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Press & Media Centre
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Latest news, press releases, and media resources for Cura Software Limited
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Mail className="h-4 w-4 mr-2" />
              Media Enquiries
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Media Kit
            </Button>
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Recent Press Releases</h2>
          <div className="space-y-6">
            {pressReleases.map((release) => (
              <Card key={release.id} className={`${release.featured ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={release.featured ? "default" : "secondary"}>
                          {release.category}
                        </Badge>
                        {release.featured && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl mb-2">{release.title}</CardTitle>
                      <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        {release.date}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{release.summary}</p>
                  <div className="flex gap-3">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Read Full Release
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Media Assets */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Media Assets</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaAssets.map((asset, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{asset.name}</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{asset.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{asset.type}</Badge>
                        <span className="text-xs text-gray-500">{asset.size}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Company Information */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Company Overview</h2>
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p>
                  <strong>Company Name:</strong> Cura Software Limited
                </p>
                <p>
                  <strong>Registration:</strong> England & Wales (16556912)
                </p>
                <p>
                  <strong>Founded:</strong> 2024
                </p>
                <p>
                  <strong>Headquarters:</strong> Solihull, England
                </p>
                <p>
                  <strong>Industry:</strong> Healthcare Technology / EMR Software
                </p>
                <p>
                  <strong>Parent Company:</strong> Halo Group
                </p>
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Key Statistics</h2>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">99.9%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Platform Uptime</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">GDPR</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Fully Compliant</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">24/7</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Support Available</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Media Contact */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Media Contact</h2>
          <p className="text-blue-100 text-lg mb-8">
            For press enquiries, interviews, and media requests
          </p>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">Press Office</h3>
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-blue-600" />
                    <a href="mailto:press@curaemr.ai" className="text-blue-600 hover:text-blue-800">
                      press@curaemr.ai
                    </a>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-blue-600" />
                    <span>+44 (0) 121 456 7892</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">Business Address</h3>
                <div className="text-gray-700 dark:text-gray-300">
                  <p>Ground Floor Unit 2, Drayton Court</p>
                  <p>Drayton Road, Solihull</p>
                  <p>England B90 4NG</p>
                  <p className="mt-2 text-sm">Company No: 16556912</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}