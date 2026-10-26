import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Search, FileText, CheckCircle2, QrCode, Lock } from 'lucide-react';
import SEOHead from '../components/SEOHead';

export default function Home() {
  const [referenceCodeInput, setReferenceCodeInput] = useState('');
  const navigate = useNavigate();

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    const trimmed = referenceCodeInput.trim().toUpperCase();
    if (trimmed) {
      navigate(`/pass/${trimmed}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <SEOHead
        title="Digital Visitor Access Management System"
        description="Streamlined campus and facility visitor management. Advance online registration, instant host approvals, and secure digital QR badges."
        canonicalPath="/"
      />

      {/* Hero Header Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider border border-blue-100">
            <ShieldCheck className="w-4 h-4" />
            <span>Digital Visitor Access Management</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Digital Visitor Access Management System
          </h1>

          <p className="text-base sm:text-lg font-medium text-slate-700 max-w-2xl mx-auto">
            Streamlined Campus &amp; Facility Visitor Passes
          </p>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Register your appointment online, obtain designated host authorization, and receive a secure, 
            verifiable digital QR pass for gate check-in and check-out.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              to="/register-visit"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
            >
              <span>Register New Visit</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors"
            >
              <span>Staff Portal Login</span>
            </Link>
          </div>

          {/* Reference Lookup Form */}
          <div className="pt-8 max-w-md mx-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left">
              <label htmlFor="refInput" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Already Registered? Check Pass Status
              </label>
              <form onSubmit={handleLookupSubmit} className="flex">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="refInput"
                    type="text"
                    value={referenceCodeInput}
                    onChange={(e) => setReferenceCodeInput(e.target.value)}
                    placeholder="e.g. AP-2026-X8B9K"
                    className="block w-full pl-9 pr-3 py-2 text-sm rounded-l-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 uppercase"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 rounded-r-lg border border-l-0 border-blue-600 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  Lookup
                </button>
              </form>
            </div>
          </div>

        </div>
      </section>

      {/* Workflow Steps */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-slate-900">System Lifecycle &amp; Verification Process</h2>
            <p className="text-sm text-slate-500 mt-1">Four structured checkpoints ensuring campus safety</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
                1
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Registration</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visitor submits their details, designated host, and purpose. System verifies credentials against the active blacklist.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
                2
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Host Approval</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Designated host reviews appointment request in their dashboard and authorizes entry with a valid time window.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
                3
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Digital QR Pass</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                System generates a tamper-evident digital badge with cryptographic QR token, accessible via reference code.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
                4
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Security Checkpoint</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gate security officer scans pass to verify validity, logging timestamps for building entry and departure.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Visitor Access Guidelines & Policy Information (Improves Text-to-Code Ratio with Valuable Content) */}
      <section className="py-12 px-4 sm:px-6 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-900">Campus Visitor Guidelines &amp; Access Policies</h2>
            <p className="text-sm text-slate-500 mt-1">Important information for guests, academic visitors, and contractors</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Advance Appointment Pre-Registration</span>
              </div>
              <p className="leading-relaxed">
                All campus guests and appointment attendees are required to submit an online registration request in advance. Submitting your intended arrival schedule, destination facility, and visit purpose allows faculty and administrative hosts adequate time to review and approve your access authorization before you travel.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Mandatory Official Identity Verification</span>
              </div>
              <p className="leading-relaxed">
                To guarantee physical perimeter safety, visitors must bring the physical government-issued identity proof (National ID card, passport, or driving license) that matches the credential details entered during registration. Campus security officers verify matching identification records before authorizing physical entry.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>Contactless Digital QR Badge Verification</span>
              </div>
              <p className="leading-relaxed">
                Approved visitors can instantly retrieve their digital access badge using their unique visit reference code and private verification secret. Present your mobile device or printed QR badge directly to gate security scanners for quick, contactless credential validation and entry authorization.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-semibold text-sm">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Comprehensive Audit Trail &amp; Campus Safety</span>
              </div>
              <p className="leading-relaxed">
                AccessPass enforces single-entry validation and prevents duplicate badge reuse while inside facilities. Physical entrance and departure timestamps are automatically logged into an immutable security audit trail, ensuring complete regulatory compliance and transparent facility accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
